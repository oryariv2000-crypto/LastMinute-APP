--
-- PostgreSQL database dump
--

-- [migration-fix] removed psql-only \restrict directive (not supported by db push)

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- [migration-fix] column defaults use extensions.uuid_generate_v4(); make sure the
-- extensions exist on the target (idempotent; they live in the `extensions` schema).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto   WITH SCHEMA extensions;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- [migration-fix] removed: CREATE SCHEMA public; (already exists on target project)


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

-- [migration-fix] removed: COMMENT ON SCHEMA public (would fail: not schema owner)


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    order_code text DEFAULT ('LM-'::text || upper(substr(md5((random())::text), 1, 5))) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    pickup_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deal_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'ready'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders IS 'A customer order against a single business.';


--
-- Name: cancel_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_order(p_order_id uuid) RETURNS public.orders
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  o      public.orders;
  pstart timestamptz;
begin
  -- Lock the order row and verify ownership.
  select * into o
    from public.orders
   where id = p_order_id and user_id = auth.uid()
   for update;

  if not found then
    raise exception 'ההזמנה לא נמצאה' using errcode = 'no_data_found';
  end if;

  if o.status not in ('pending', 'active', 'ready') then
    raise exception 'לא ניתן לבטל הזמנה במצב הנוכחי' using errcode = 'check_violation';
  end if;

  -- Cancellation closes once the pickup window opens. NULL window = no limit.
  select pickup_start into pstart from public.deals where id = o.deal_id;
  if pstart is not null and now() >= pstart then
    raise exception 'חלון האיסוף כבר התחיל — לא ניתן לבטל'
      using errcode = 'check_violation';
  end if;

  -- Put the units back on the shelf, then cancel.
  update public.deals
     set quantity_left = quantity_left + coalesce(o.quantity, 1)
   where id = o.deal_id;

  update public.orders set status = 'cancelled'
   where id = o.id
  returning * into o;

  return o;
end;
$$;


--
-- Name: complete_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_order(p_order_id uuid) RETURNS public.orders
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  o public.orders;
begin
  update public.orders
     set status = 'completed'
   where id = p_order_id
     and user_id = auth.uid()                       -- only my own order
     and status in ('pending', 'active', 'ready')   -- and only while still open
  returning * into o;

  if not found then
    raise exception 'לא ניתן לאשר את ההזמנה (כבר נאספה/בוטלה או אינה שייכת לך)'
      using errcode = 'check_violation';
  end if;

  return o;
end;
$$;


--
-- Name: decrement_deal_quantity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_deal_quantity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.deals
  SET
    quantity_left = quantity_left - NEW.quantity,
    status = CASE
      WHEN (quantity_left - NEW.quantity) <= 0 THEN 'sold_out'
      ELSE status
    END
  WHERE id = NEW.deal_id;
  RETURN NEW;
END;
$$;


--
-- Name: decrement_deal_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_deal_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  qty     int := coalesce(new.quantity, 1);
  updated int;
begin
  -- Atomic conditional decrement: only succeeds while enough stock remains.
  -- Locks the deal row, so concurrent orders can't both grab the last unit.
  update public.deals
     set quantity_left = quantity_left - qty
   where id = new.deal_id
     and quantity_left >= qty;

  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'אזל מהמלאי — הכמות המבוקשת אינה זמינה'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;


--
-- Name: get_business_sales_timeseries(uuid, timestamp with time zone, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_business_sales_timeseries(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_bucket text DEFAULT 'day'::text) RETURNS TABLE(bucket_start timestamp with time zone, revenue numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_bucket text := lower(p_bucket); v_step interval;
begin
  if v_bucket not in ('day','week','month') then raise exception 'bad bucket'; end if;
  if not exists (select 1 from public.businesses b where b.id = p_business_id and b.user_id = auth.uid())
  then raise exception 'Not authorized' using errcode = '42501'; end if;
  v_step := ('1 '||v_bucket)::interval;
  return query
  with buckets as (
    select gs as bucket_start from generate_series(date_trunc(v_bucket,p_from), date_trunc(v_bucket,p_to), v_step) gs
  )
  select b.bucket_start, coalesce(sum(o.total),0)::numeric
  from buckets b
  left join public.orders o on date_trunc(v_bucket,o.created_at)=b.bucket_start
    and o.status <> 'cancelled'
    and o.deal_id in (select id from public.deals where business_id = p_business_id)
  group by b.bucket_start order by b.bucket_start;
end; $$;


--
-- Name: get_business_stats(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_business_stats(p_business_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(total_revenue numeric, total_orders bigint, active_deals_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not exists (select 1 from public.businesses b where b.id = p_business_id and b.user_id = auth.uid())
  then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
  select coalesce(sum(o.total),0)::numeric, count(o.id)::bigint,
    (select count(*)::bigint from public.deals d where d.business_id = p_business_id and d.status='active')
  from public.orders o join public.deals d2 on d2.id = o.deal_id
  where d2.business_id = p_business_id and o.status <> 'cancelled'
    and (p_from is null or o.created_at >= p_from) and (p_to is null or o.created_at < p_to);
end; $$;


--
-- Name: get_business_top_products(uuid, timestamp with time zone, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_business_top_products(p_business_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 6) RETURNS TABLE(product text, revenue numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.user_id = auth.uid()
  ) then
    raise exception 'Not authorized for business %', p_business_id using errcode = '42501';
  end if;

  return query
  select
    coalesce(d.title, 'אחר')           as product,
    coalesce(sum(o.total), 0)::numeric as revenue
  from public.orders o
  join public.deals d on d.id = o.deal_id
  where d.business_id = p_business_id
    and o.status <> 'cancelled'
    and (p_from is null or o.created_at >= p_from)
    and (p_to   is null or o.created_at <  p_to)
  group by 1
  having coalesce(sum(o.total), 0) > 0
  order by revenue desc
  limit greatest(p_limit, 1);
end;
$$;


--
-- Name: get_my_business_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_business_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT id FROM public.businesses WHERE user_id = auth.uid()
$$;


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;


--
-- Name: touch_support_ticket(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_support_ticket() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at := now(); return new; end; $$;


--
-- Name: update_business_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_business_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.businesses
  SET rating = (
    SELECT ROUND(AVG(rating)::NUMERIC, 2)
    FROM public.reviews
    WHERE business_id = NEW.business_id
  )
  WHERE id = NEW.business_id;
  RETURN NEW;
END;
$$;


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    address text,
    location_lat double precision,
    location_lng double precision,
    logo_url text,
    cover_url text,
    rating numeric(3,2) DEFAULT 0.00,
    is_approved boolean DEFAULT false NOT NULL,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    business_type text,
    phone text,
    opening_hours jsonb DEFAULT '{}'::jsonb,
    gallery jsonb DEFAULT '[]'::jsonb,
    notify_push boolean DEFAULT true,
    notify_email boolean DEFAULT false,
    closed_until timestamp with time zone
);


--
-- Name: TABLE businesses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.businesses IS 'One business per business_owner account.';


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    icon text,
    slug text NOT NULL
);


--
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.categories IS 'Deal / business categories e.g. bakery, restaurant, grocery.';


--
-- Name: deal_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_images (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    deal_id uuid NOT NULL,
    image_url text NOT NULL,
    sort_order smallint DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE deal_images; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_images IS 'Multiple photos per deal, captured via CameraCaptureSection.';


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    business_id uuid NOT NULL,
    category_id uuid,
    title text NOT NULL,
    description text,
    original_price numeric(10,2) NOT NULL,
    discount_price numeric(10,2) NOT NULL,
    quantity_total integer DEFAULT 1 NOT NULL,
    quantity_left integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    pickup_start timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT deals_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'sold_out'::text, 'expired'::text]))),
    CONSTRAINT price_check CHECK ((discount_price < original_price)),
    CONSTRAINT qty_check CHECK (((quantity_left >= 0) AND (quantity_left <= quantity_total)))
);


--
-- Name: TABLE deals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deals IS 'A last-minute discount deal published by a business.';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    is_read boolean DEFAULT false NOT NULL,
    ref_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['order_confirmed'::text, 'order_ready'::text, 'order_cancelled'::text, 'new_deal'::text, 'review_received'::text, 'business_approved'::text])))
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'In-app push notifications for both roles.';


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    deal_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    price_at_purchase numeric(10,2) NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: TABLE order_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_items IS 'Line items inside an order. Price locked at time of purchase.';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    method text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    amount numeric(10,2) NOT NULL,
    transaction_id text,
    paid_at timestamp with time zone,
    CONSTRAINT payments_method_check CHECK ((method = ANY (ARRAY['apple_pay'::text, 'credit_card'::text, 'cash'::text]))),
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])))
);


--
-- Name: TABLE payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payments IS 'One payment record per order.';


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    order_id uuid,
    rating smallint NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: TABLE reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reviews IS 'One review per user per order. Rating updates business.rating via trigger.';


--
-- Name: saved_deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_deals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    deal_id uuid NOT NULL,
    saved_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE saved_deals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.saved_deals IS 'Deals bookmarked by a customer (heart / save button).';


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    role text,
    category text DEFAULT 'question'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    contact text,
    screenshot_url text,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    phone text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'customer'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text,
    phone text,
    avatar_url text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['customer'::text, 'business_owner'::text, 'admin'::text])))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'One row per account. Auth is handled by Supabase Auth — this mirrors auth.users.';


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_user_id_key UNIQUE (user_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: deal_images deal_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_images
    ADD CONSTRAINT deal_images_pkey PRIMARY KEY (id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_code_key UNIQUE (order_code);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_key UNIQUE (order_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_user_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_order_id_key UNIQUE (user_id, order_id);


--
-- Name: reviews reviews_user_order_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_order_unique UNIQUE (user_id, order_id);


--
-- Name: saved_deals saved_deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_deals
    ADD CONSTRAINT saved_deals_pkey PRIMARY KEY (id);


--
-- Name: saved_deals saved_deals_user_deal_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_deals
    ADD CONSTRAINT saved_deals_user_deal_unique UNIQUE (user_id, deal_id);


--
-- Name: saved_deals saved_deals_user_id_deal_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_deals
    ADD CONSTRAINT saved_deals_user_id_deal_id_key UNIQUE (user_id, deal_id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: deals_tags_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_tags_idx ON public.deals USING gin (tags);


--
-- Name: idx_businesses_approved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_approved ON public.businesses USING btree (is_approved);


--
-- Name: idx_businesses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_category ON public.businesses USING btree (category_id);


--
-- Name: idx_businesses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_user ON public.businesses USING btree (user_id);


--
-- Name: idx_deal_images_deal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deal_images_deal ON public.deal_images USING btree (deal_id);


--
-- Name: idx_deals_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_business ON public.deals USING btree (business_id);


--
-- Name: idx_deals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_status ON public.deals USING btree (status);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_order_items_deal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_deal ON public.order_items USING btree (deal_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_business ON public.orders USING btree (business_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);


--
-- Name: idx_payments_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order ON public.payments USING btree (order_id);


--
-- Name: idx_reviews_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_business ON public.reviews USING btree (business_id);


--
-- Name: idx_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user ON public.reviews USING btree (user_id);


--
-- Name: idx_saved_deals_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_deals_user ON public.saved_deals USING btree (user_id);


--
-- Name: reviews_business_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_business_id_idx ON public.reviews USING btree (business_id, created_at DESC);


--
-- Name: saved_deals_user_deal_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX saved_deals_user_deal_uniq ON public.saved_deals USING btree (user_id, deal_id);


--
-- Name: support_tickets_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_status_idx ON public.support_tickets USING btree (status);


--
-- Name: support_tickets_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_user_idx ON public.support_tickets USING btree (user_id);


--
-- Name: support_tickets support_tickets_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER support_tickets_touch BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket();


--
-- Name: orders trg_decrement_deal_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_decrement_deal_stock BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.decrement_deal_stock();


--
-- Name: order_items trg_decrement_qty; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_decrement_qty AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.decrement_deal_quantity();


--
-- Name: reviews trg_update_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_rating AFTER INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_business_rating();


--
-- Name: businesses businesses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: businesses businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: deal_images deal_images_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_images
    ADD CONSTRAINT deal_images_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: deals deals_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: deals deals_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE RESTRICT;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;


--
-- Name: orders orders_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE RESTRICT;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: saved_deals saved_deals_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_deals
    ADD CONSTRAINT saved_deals_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: saved_deals saved_deals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_deals
    ADD CONSTRAINT saved_deals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: businesses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

--
-- Name: businesses businesses: owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "businesses: owner delete" ON public.businesses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: businesses businesses: owner insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "businesses: owner insert" ON public.businesses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: businesses businesses: owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "businesses: owner update" ON public.businesses FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: businesses businesses: read all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "businesses: read all" ON public.businesses FOR SELECT TO authenticated USING (true);


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories: public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "categories: public read" ON public.categories FOR SELECT USING (true);


--
-- Name: deal_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_images ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_images deal_images: owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal_images: owner delete" ON public.deal_images FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.deals d
  WHERE ((d.id = deal_images.deal_id) AND (d.business_id = public.get_my_business_id())))));


--
-- Name: deal_images deal_images: owner insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal_images: owner insert" ON public.deal_images FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.deals d
  WHERE ((d.id = deal_images.deal_id) AND (d.business_id = public.get_my_business_id())))));


--
-- Name: deal_images deal_images: owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal_images: owner update" ON public.deal_images FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.deals d
  WHERE ((d.id = deal_images.deal_id) AND (d.business_id = public.get_my_business_id())))));


--
-- Name: deal_images deal_images: public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal_images: public read" ON public.deal_images FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.deals d
  WHERE ((d.id = deal_images.deal_id) AND ((d.status = 'active'::text) OR (d.business_id = public.get_my_business_id()))))));


--
-- Name: deals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

--
-- Name: deals deals: owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deals: owner delete" ON public.deals FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = deals.business_id) AND (b.user_id = auth.uid())))));


--
-- Name: deals deals: owner insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deals: owner insert" ON public.deals FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = deals.business_id) AND (b.user_id = auth.uid())))));


--
-- Name: deals deals: owner read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deals: owner read own" ON public.deals FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = deals.business_id) AND (b.user_id = auth.uid())))));


--
-- Name: deals deals: owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deals: owner update" ON public.deals FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = deals.business_id) AND (b.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = deals.business_id) AND (b.user_id = auth.uid())))));


--
-- Name: deals deals: read active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deals: read active" ON public.deals FOR SELECT TO authenticated USING ((status = 'active'::text));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications: read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications: read own" ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: notifications notifications: update own (mark read); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications: update own (mark read)" ON public.notifications FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items order_items: customer insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "order_items: customer insert" ON public.order_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid())))));


--
-- Name: order_items order_items: customer read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "order_items: customer read own" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid())))));


--
-- Name: order_items order_items: owner read incoming; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "order_items: owner read incoming" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.business_id = public.get_my_business_id())))));


--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: orders orders: business read on own deals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "orders: business read on own deals" ON public.orders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.deals d
     JOIN public.businesses b ON ((b.id = d.business_id)))
  WHERE ((d.id = orders.deal_id) AND (b.user_id = auth.uid())))));


--
-- Name: orders orders: business update on own deals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "orders: business update on own deals" ON public.orders FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.deals d
     JOIN public.businesses b ON ((b.id = d.business_id)))
  WHERE ((d.id = orders.deal_id) AND (b.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.deals d
     JOIN public.businesses b ON ((b.id = d.business_id)))
  WHERE ((d.id = orders.deal_id) AND (b.user_id = auth.uid())))));


--
-- Name: orders orders: customer insert own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "orders: customer insert own" ON public.orders FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: orders orders: customer read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "orders: customer read own" ON public.orders FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments: customer insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "payments: customer insert" ON public.payments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = auth.uid())))));


--
-- Name: payments payments: customer read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "payments: customer read own" ON public.payments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = auth.uid())))));


--
-- Name: payments payments: owner read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "payments: owner read" ON public.payments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (o.business_id = public.get_my_business_id())))));


--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews reviews: delete own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reviews: delete own" ON public.reviews FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: reviews reviews: insert after order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reviews: insert after order" ON public.reviews FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM (public.orders o
     JOIN public.deals d ON ((d.id = o.deal_id)))
  WHERE ((o.user_id = auth.uid()) AND (d.business_id = reviews.business_id) AND (o.status <> 'cancelled'::text))))));


--
-- Name: reviews reviews: read all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reviews: read all" ON public.reviews FOR SELECT TO authenticated USING (true);


--
-- Name: reviews reviews: update after order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reviews: update after order" ON public.reviews FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM (public.orders o
     JOIN public.deals d ON ((d.id = o.deal_id)))
  WHERE ((o.user_id = auth.uid()) AND (d.business_id = reviews.business_id) AND (o.status <> 'cancelled'::text))))));


--
-- Name: saved_deals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_deals ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_deals saved_deals: delete own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "saved_deals: delete own" ON public.saved_deals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: saved_deals saved_deals: insert own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "saved_deals: insert own" ON public.saved_deals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: saved_deals saved_deals: select own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "saved_deals: select own" ON public.saved_deals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets tickets: admin update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "tickets: admin update" ON public.support_tickets FOR UPDATE TO authenticated USING ((auth.email() = 'oryariv2000@gmail.com'::text)) WITH CHECK ((auth.email() = 'oryariv2000@gmail.com'::text));


--
-- Name: support_tickets tickets: anon insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "tickets: anon insert" ON public.support_tickets FOR INSERT TO anon WITH CHECK ((user_id IS NULL));


--
-- Name: support_tickets tickets: insert own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "tickets: insert own" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets tickets: read own or admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "tickets: read own or admin" ON public.support_tickets FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (auth.email() = 'oryariv2000@gmail.com'::text)));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users: insert own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users: insert own" ON public.users FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: users users: read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users: read own" ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: users users: update own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users: update own" ON public.users FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.orders TO service_role;


--
-- Name: FUNCTION cancel_order(p_order_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cancel_order(p_order_id uuid) TO authenticated;


--
-- Name: FUNCTION complete_order(p_order_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.complete_order(p_order_id uuid) TO authenticated;


--
-- Name: FUNCTION get_business_sales_timeseries(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_bucket text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_business_sales_timeseries(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_bucket text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_business_sales_timeseries(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_bucket text) TO authenticated;


--
-- Name: FUNCTION get_business_stats(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_business_stats(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_business_stats(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;


--
-- Name: FUNCTION get_business_top_products(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_business_top_products(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_business_top_products(p_business_id uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer) TO authenticated;


--
-- Name: TABLE businesses; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.businesses TO anon;
GRANT ALL ON TABLE public.businesses TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.businesses TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.categories TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.categories TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.categories TO service_role;


--
-- Name: TABLE deal_images; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.deal_images TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.deal_images TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.deal_images TO service_role;


--
-- Name: TABLE deals; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.deals TO anon;
GRANT ALL ON TABLE public.deals TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.deals TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.notifications TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.notifications TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.notifications TO service_role;


--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.order_items TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.order_items TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.order_items TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.payments TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.payments TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.payments TO service_role;


--
-- Name: TABLE reviews; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.reviews TO anon;
GRANT ALL ON TABLE public.reviews TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.reviews TO service_role;


--
-- Name: TABLE saved_deals; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.saved_deals TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.saved_deals TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.saved_deals TO service_role;


--
-- Name: TABLE support_tickets; Type: ACL; Schema: public; Owner: -
--

GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.support_tickets TO anon;
GRANT ALL ON TABLE public.support_tickets TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.support_tickets TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.users TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
-- [migration-fix: postgres is not a member of supabase_admin] ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

-- ============================================================================
-- [migration-fix] Cross-schema objects a public-only pg_dump cannot capture,
-- reproduced verbatim from the source project's live `storage` schema:
-- the storage buckets and the RLS policies on storage.objects.
-- (No trigger exists on auth.users in production, so none is recreated here.)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('avatars','avatars','true',NULL,NULL) ON CONFLICT (id) DO UPDATE SET public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('business-logos','business-logos','true',NULL,NULL) ON CONFLICT (id) DO UPDATE SET public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('deal-images','deal-images','true',NULL,NULL) ON CONFLICT (id) DO UPDATE SET public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('voice-scans','voice-scans','false',NULL,NULL) ON CONFLICT (id) DO UPDATE SET public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

DROP POLICY IF EXISTS "lm: delete own deal image" ON storage.objects;
CREATE POLICY "lm: delete own deal image" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'deal-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS "lm: public read avatars" ON storage.objects;
CREATE POLICY "lm: public read avatars" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatars'::text));
DROP POLICY IF EXISTS "lm: public read deal-images" ON storage.objects;
CREATE POLICY "lm: public read deal-images" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'deal-images'::text));
DROP POLICY IF EXISTS "lm: update own avatar" ON storage.objects;
CREATE POLICY "lm: update own avatar" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS "lm: write own avatar" ON storage.objects;
CREATE POLICY "lm: write own avatar" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS "lm: write own deal image" ON storage.objects;
CREATE POLICY "lm: write own deal image" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'deal-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS "storage: avatars public read" ON storage.objects;
CREATE POLICY "storage: avatars public read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatars'::text));
DROP POLICY IF EXISTS "storage: avatars upload" ON storage.objects;
CREATE POLICY "storage: avatars upload" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "storage: business-logos public read" ON storage.objects;
CREATE POLICY "storage: business-logos public read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'business-logos'::text));
DROP POLICY IF EXISTS "storage: business-logos upload" ON storage.objects;
CREATE POLICY "storage: business-logos upload" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'business-logos'::text) AND (auth.role() = 'authenticated'::text)));
DROP POLICY IF EXISTS "storage: deal-images public read" ON storage.objects;
CREATE POLICY "storage: deal-images public read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'deal-images'::text));
DROP POLICY IF EXISTS "storage: deal-images upload" ON storage.objects;
CREATE POLICY "storage: deal-images upload" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'deal-images'::text) AND (auth.role() = 'authenticated'::text)));
DROP POLICY IF EXISTS "storage: voice-scans owner read" ON storage.objects;
CREATE POLICY "storage: voice-scans owner read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'voice-scans'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "storage: voice-scans upload" ON storage.objects;
CREATE POLICY "storage: voice-scans upload" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'voice-scans'::text) AND (auth.role() = 'authenticated'::text)));

NOTIFY pgrst, 'reload schema';

