/**
 * db.js — Single place for all Supabase data + storage access.
 *
 * Column names match the LIVE database schema:
 *   users        id, email, role, full_name, phone, avatar_url, created_at
 *   businesses   id, user_id (owner), name, address, is_open, is_approved, ...
 *   deals        id, business_id, title, original_price, discounted_price,
 *                quantity_total, quantity_left, status, image_url, category, ...
 *   orders       id, user_id (customer), deal_id, subtotal, total, status,
 *                order_code, quantity, created_at
 *
 * Ownership chain: auth user → users → businesses(user_id) → deals(business_id) → orders
 * Every function throws on error; row scoping is enforced by RLS.
 */
import { supabase } from './supabase'

/* ── Auth helpers ─────────────────────────────────────────────── */

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('לא מחובר. התחבר מחדש.')
  return data.user
}

/* ── Profiles (public.users) ──────────────────────────────────── */

export async function getMyProfile() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateMyProfile(fields) {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('users')
    .update(fields)
    .eq('id', user.id)
    .select()
    .single()
  if (error) throw error
  return data
}

/* ── Businesses (owner column = user_id) ──────────────────────── */

export async function getMyBusiness() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** All businesses (for the explore map). Includes coordinates when present. */
export async function getBusinessesForMap() {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, address, location_lat, location_lng')
  if (error) throw error
  return data ?? []
}

export async function updateMyBusiness(fields) {
  const biz = await getMyBusiness()
  if (!biz) throw new Error('לא נמצא עסק למשתמש זה.')
  const { data, error } = await supabase
    .from('businesses')
    .update(fields)
    .eq('id', biz.id)
    .select()
    .single()
  if (error) throw error
  return data
}

/* ── Deals ────────────────────────────────────────────────────── */

/** All active deals for the B2C feed, newest first, with the shop joined. */
export async function getActiveDeals() {
  const { data, error } = await supabase
    .from('deals')
    .select('*, businesses ( name, address )')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** A single deal (product page), with its shop joined. */
export async function getDealById(id) {
  const { data, error } = await supabase
    .from('deals')
    .select('*, businesses ( name, address, phone )')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Deals belonging to the current owner's business, newest first. */
export async function getMyDeals() {
  const biz = await getMyBusiness()
  if (!biz) return []
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Insert a deal for the current owner's business. business_id is derived
 * server-side from the owner — never trusted from the client.
 * Accepts friendly fields and maps them to the real columns.
 */
export async function createDeal({
  title,
  original_price,
  discounted_price,
  quantity,
  image_url = null,
  category = null,
  status = 'active',
}) {
  const biz = await getMyBusiness()
  if (!biz) throw new Error('יש ליצור עסק לפני פרסום מבצע.')
  const qty = Number(quantity) || 0
  const { data, error } = await supabase
    .from('deals')
    .insert({
      business_id: biz.id,
      title,
      original_price,
      discounted_price,
      quantity_total: qty,
      quantity_left: qty,
      image_url,
      category,
      status,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDeal(id, fields) {
  const { data, error } = await supabase
    .from('deals')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDeal(id) {
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) throw error
}

/* ── Orders (customer column = user_id) ───────────────────────── */

/** Create an order for the current customer against a deal. */
export async function createOrder({ deal_id, quantity, total }) {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      deal_id,
      quantity,
      subtotal: total,
      total,
    })
    .select('*, deals ( title, image_url, pickup_start, businesses ( name, address, phone ) )')
    .single()
  if (error) throw error
  return data
}

/** The current customer's order history, newest first. */
export async function getMyOrders() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('orders')
    .select('*, deals ( title, image_url, businesses ( name ) )')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Look up a single order by its human-readable code (RLS scopes access). */
export async function getOrderByCode(code) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, deals ( title, pickup_start, businesses ( name, address, phone ) )')
    .eq('order_code', code)
    .maybeSingle()
  if (error) throw error
  return data
}

/* ── Stats (server-side RPC) ──────────────────────────────────── */

/**
 * Aggregated stats for a business, computed by the get_business_stats()
 * PL/pgSQL function (supabase/rpc_business_stats.sql).
 *
 * @param {string} [businessId] - defaults to the current owner's business.
 */
export async function fetchBusinessStats(businessId) {
  let id = businessId
  if (!id) {
    const biz = await getMyBusiness()
    if (!biz) return { total_revenue: 0, total_orders: 0, active_deals_count: 0 }
    id = biz.id
  }
  const { data, error } = await supabase.rpc('get_business_stats', {
    p_business_id: id,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    total_revenue: Number(row?.total_revenue ?? 0),
    total_orders: Number(row?.total_orders ?? 0),
    active_deals_count: Number(row?.active_deals_count ?? 0),
  }
}

/* ── Storage ──────────────────────────────────────────────────── */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

function assertImage(file) {
  if (!file) throw new Error('לא נבחר קובץ.')
  if (!file.type.startsWith('image/')) throw new Error('יש לבחור קובץ תמונה.')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('הקובץ גדול מדי (מקסימום 5MB).')
}

function fileExt(file) {
  const parts = file.name.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : 'jpg'
}

/** Upload an avatar to the `avatars` bucket and write the URL to the profile. */
export async function uploadAvatar(file) {
  assertImage(file)
  const user = await requireUser()
  const path = `${user.id}/avatar.${fileExt(file)}`
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`
  await updateMyProfile({ avatar_url: publicUrl })
  return publicUrl
}

/** Upload a deal image to the `deal-images` bucket; returns its public URL. */
export async function uploadDealImage(file) {
  assertImage(file)
  const user = await requireUser()
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt(file)}`
  const { error: upErr } = await supabase.storage
    .from('deal-images')
    .upload(path, file, { cacheControl: '3600' })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('deal-images').getPublicUrl(path)
  return data.publicUrl
}

/* ── Small shared helpers ─────────────────────────────────────── */

/** Discount percentage from original/discounted price. */
export function discountPct(original, discounted) {
  if (!original || original <= discounted) return 0
  return Math.round(((original - discounted) / original) * 100)
}
