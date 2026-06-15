/**
 * Shared icon components — extracted from duplicated inline SVGs (audit #4, DRY).
 * Each component accepts { size = 24, ...props } and spreads props onto <svg>.
 * Paths/attributes are copied verbatim from the original inline instances.
 */

// ── Base helpers ──────────────────────────────────────────────────────────────

function StrokeIcon({ size = 24, strokeWidth = 2, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

// ── Auth / form icons ─────────────────────────────────────────────────────────

/** User silhouette — appears in AuthForm, RegisterFormB2B, RegisterFormB2C, BottomNavigationB2C, RoleSelector */
export const UserIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </StrokeIcon>
);

/** Envelope / email — appears in AuthForm, RegisterFormB2B, RegisterFormB2C, UserProfileHeader, B2CProfilePage */
export const EmailIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="2 4 12 13 22 4" />
  </StrokeIcon>
);

/** Phone — appears in AuthForm, RegisterFormB2B, RegisterFormB2C, UserProfileHeader, PickupInstructions, OpenBusinessPage */
export const PhoneIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.84 12 19.79 19.79 0 0 1 1.77 3.35 2 2 0 0 1 3.74 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </StrokeIcon>
);

/** Padlock — appears in AuthForm, RegisterFormB2B, RegisterFormB2C, PaymentMethodsSection */
export const LockIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </StrokeIcon>
);

/** Eye (show password) — appears in AuthForm, RegisterFormB2B, RegisterFormB2C */
export const EyeIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </StrokeIcon>
);

/** Eye-off (hide password) — appears in AuthForm, RegisterFormB2B, RegisterFormB2C */
export const EyeOffIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </StrokeIcon>
);

// ── Navigation icons ──────────────────────────────────────────────────────────

/** House / home — appears in BottomNavigationB2B, BottomNavigationB2C, RegisterFormB2B, OpenBusinessPage, RoleSelector */
export const HomeIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </StrokeIcon>
);

/** Log out (arrow-right-from-box) — appears in NavbarB2B, NavbarB2C, B2CProfilePage, B2BProfilePage */
export const LogoutIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </StrokeIcon>
);

/** Chevron right — appears in many pages (B2BAiReviewPage, B2BNewDealPage, B2BRegisterPage, B2CCheckoutPage, B2CBusinessPage, B2CRegisterPage, DealInfoSection, DealHeroImage, NewDealButton) */
export const ChevronRightIcon = ({ size = 24, strokeWidth = 2.5, ...props }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...props}>
    <polyline points="9 18 15 12 9 6" />
  </StrokeIcon>
);

/** Chevron left — appears in SettingsList, BusinessSettingsList, LocationPickerModal, NewDealButton */
export const ChevronLeftIcon = ({ size = 24, strokeWidth = 2.5, ...props }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...props}>
    <polyline points="15 18 9 12 15 6" />
  </StrokeIcon>
);

/** Chevron down — appears in RegisterFormB2B, OpenBusinessPage */
export const ChevronDownIcon = ({ size = 24, strokeWidth = 2.5, ...props }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...props}>
    <polyline points="6 9 12 15 18 9" />
  </StrokeIcon>
);

/** X / close — appears in NavbarB2C, CameraCaptureSection, DealEditModal, StorefrontEditModal, B2CBusinessPage */
export const XIcon = ({ size = 24, strokeWidth = 2.5, ...props }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </StrokeIcon>
);

/** Checkmark / tick — appears in PublishActions, PickerModal, LocationPickerModal, RoleSelector, B2CConfirmationPage */
export const CheckIcon = ({ size = 24, strokeWidth = 2.5, ...props }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...props}>
    <polyline points="20 6 9 17 4 12" />
  </StrokeIcon>
);

/** Plus (+) — appears in BottomNavigationB2B, AddToCartBar, ReviewListItem, ReviewListSection */
export const PlusIcon = ({ size = 24, strokeWidth = 2.5, ...props }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </StrokeIcon>
);

/** Minus (–) — appears in AddToCartBar, ReviewListItem */
export const MinusIcon = ({ size = 24, strokeWidth = 2.5, ...props }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </StrokeIcon>
);

// ── Location / map icons ──────────────────────────────────────────────────────

/** Map pin / location — appears in RegisterFormB2B, BusinessProfileHeader, DealInfoSection, AddressBookModal, PickupInstructions, B2CBusinessPage, OpenBusinessPage, B2CProfilePage */
export const MapPinIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </StrokeIcon>
);

// ── Star / rating ─────────────────────────────────────────────────────────────

/** Filled star polygon — appears in BusinessProfileHeader, DealInfoSection, ProductCard, ActivityListItem */
export const StarFilledIcon = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// ── Clock / time ──────────────────────────────────────────────────────────────

/** Clock — appears in DealInfoSection, ProductCard, ActiveDealCard, PickupInstructions, DealHeroImage */
export const ClockIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </StrokeIcon>
);

// ── Pencil / edit ─────────────────────────────────────────────────────────────

/** Pencil / edit — appears in UserProfileHeader, BusinessProfileHeader, ActiveDealCard, B2CProfilePage (UserProfileHeader uses it) */
export const EditIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </StrokeIcon>
);

// ── Camera ────────────────────────────────────────────────────────────────────

/** Camera — appears in CameraCaptureSection, DealEditModal, ReviewListItem */
export const CameraIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </StrokeIcon>
);

// ── Bell / notifications ──────────────────────────────────────────────────────

/** Bell — appears in NotificationsBell, B2CProfilePage, B2BProfilePage */
export const BellIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </StrokeIcon>
);

// ── Shopping / cart ───────────────────────────────────────────────────────────

/** Shopping bag — appears in BottomNavigationB2C, AddToCartBar, B2CProfilePage */
export const ShoppingBagIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </StrokeIcon>
);

/** Credit card — appears in PaymentMethodsSection, B2CProfilePage */
export const CreditCardIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </StrokeIcon>
);

// ── Trash / delete ────────────────────────────────────────────────────────────

/** Trash can (with lid handle) — AddressBookModal, ActiveDealCard, ReviewListItem */
export const TrashIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </StrokeIcon>
);

// ── Search ────────────────────────────────────────────────────────────────────

/** Search / magnifying glass — appears in NavbarB2C, B2CBusinessPage */
export const SearchIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </StrokeIcon>
);

// ── Bag (B2B) ─────────────────────────────────────────────────────────────────

/** Briefcase / job bag — appears in RegisterFormB2B, OpenBusinessPage */
export const BriefcaseIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="17" />
    <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
  </StrokeIcon>
);

// ── Tag ───────────────────────────────────────────────────────────────────────

/** Tag/label — appears in ActivityListItem, ReviewListItem */
export const TagIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </StrokeIcon>
);

// ── Image / gallery ───────────────────────────────────────────────────────────

/** Image placeholder — appears in ReviewListItem */
export const ImageIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </StrokeIcon>
);

// ── Users (group) ─────────────────────────────────────────────────────────────

/** Users / group — appears in B2BProfilePage */
export const UsersIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </StrokeIcon>
);

// ── Help / info ───────────────────────────────────────────────────────────────

/** Help circle (?) — appears in B2CProfilePage, B2BProfilePage */
export const HelpCircleIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </StrokeIcon>
);

/** Info circle — appears in B2CProfilePage */
export const InfoCircleIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </StrokeIcon>
);

// ── Arrow up / down (revenue) ─────────────────────────────────────────────────

/** Arrow up — appears in RevenueCard */
export const ArrowUpIcon = ({ size = 24, strokeWidth = 2.5, ...props }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...props}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </StrokeIcon>
);

/** Arrow down — appears in RevenueCard */
export const ArrowDownIcon = ({ size = 24, strokeWidth = 2.5, ...props }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </StrokeIcon>
);

// ── Media controls (deal pause/resume, voice dictation) ──────────────────────

/** Pause (two bars) — appears in ActiveDealCard */
export const PauseIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </StrokeIcon>
);

/** Play (triangle) — appears in ActiveDealCard */
export const PlayIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <polygon points="6 4 20 12 6 20 6 4" />
  </StrokeIcon>
);

/** Stop (filled square) — appears in B2BNewDealPage (voice dictation) */
export const StopIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

/** Microphone — appears in B2BNewDealPage (voice dictation) */
export const MicIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </StrokeIcon>
);

// ── Navigation / discovery ───────────────────────────────────────────────────

/** Bar chart — appears in BottomNavigationB2B */
export const BarChartIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </StrokeIcon>
);

/** Compass / explore — appears in BottomNavigationB2C */
export const CompassIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </StrokeIcon>
);

/** Navigation arrow (open in maps) — appears in PickupInstructions */
export const NavigationIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </StrokeIcon>
);

/** Crosshair (use my location) — appears in LocationPickerModal */
export const CrosshairIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="12" cy="12" r="8" />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
  </StrokeIcon>
);

/** Filter funnel — appears in B2CHomePage */
export const FilterIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </StrokeIcon>
);

// ── Actions / misc ───────────────────────────────────────────────────────────

/** Share (connected nodes) — appears in DealHeroImage */
export const ShareIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </StrokeIcon>
);

/** Heart (favorite) — fills when `filled`. Appears in DealHeroImage */
export const HeartIcon = ({ size = 24, filled = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

/** Star outline (rating, fills when `filled`) — appears in B2CBusinessPage, ActivityListItem */
export const StarIcon = ({ size = 24, filled = true, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
    {...props}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/** Zoom-in (magnifier with plus) — appears in B2CBusinessPage gallery */
export const ZoomIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </StrokeIcon>
);

/** Sparkle (AI magic) — appears in NewDealButton, ReviewListSection */
export const SparkleIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M12 3l1.9 5.4L19 10l-5.1 1.6L12 17l-1.9-5.4L5 10l5.1-1.6z" />
    <path d="M19 17l.9 2L22 19.9 19.9 21 19 23l-.9-2L16 19.9 18.1 19z" />
  </StrokeIcon>
);

// ── Status / stats ───────────────────────────────────────────────────────────

/** Check-in-box (completed/active) — appears in ActivityListItem, B2BDashboardPage */
export const CheckSquareIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </StrokeIcon>
);

/** Alert circle (expiry/warning) — appears in ActivityListItem */
export const AlertCircleIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </StrokeIcon>
);

/** Box / package (stock units) — appears in B2BDashboardPage */
export const BoxIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </StrokeIcon>
);

/** Dollar sign (revenue) — appears in B2BDashboardPage */
export const DollarSignIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </StrokeIcon>
);

// ── Profile / eco ────────────────────────────────────────────────────────────

/** Globe (language/region) — appears in B2CProfilePage */
export const GlobeIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </StrokeIcon>
);

/** Ruler (units/measurement) — appears in B2CProfilePage */
export const RulerIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <rect x="2" y="9" width="20" height="6" rx="1" />
    <line x1="6" y1="9" x2="6" y2="13" />
    <line x1="10" y1="9" x2="10" y2="13" />
    <line x1="14" y1="9" x2="14" y2="13" />
    <line x1="18" y1="9" x2="18" y2="13" />
  </StrokeIcon>
);

/** Leaf (eco impact) — appears in B2CProfilePage */
export const LeafIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <path d="M11 20A7 7 0 0 1 4 13c0-7 7-12 16-12 0 9-5 16-12 16z" />
    <line x1="4" y1="22" x2="14" y2="12" />
  </StrokeIcon>
);

// ── Brand marks (monochrome, currentColor) ───────────────────────────────────

/** Apple logo — appears in PaymentMethodsSection (Apple Pay). Multicolor brand
 *  marks (e.g. Google's "G") stay inline in their own component; this one is
 *  monochrome so it lives here with the rest of the currentColor icons. */
export const AppleIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16.365 1.43c0 1.14-.41 2.18-1.23 2.95-.85.81-1.86 1.27-2.94 1.18-.06-1.13.45-2.27 1.27-3.06.83-.79 1.93-1.18 2.9-1.07zM20.5 17.4c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.51-4.12 3.52-1.54.02-1.94-1.01-4.04-1-2.1.01-2.54 1.02-4.08 1-1.73-.01-3.05-1.78-4.05-3.34C-.05 16.84-.34 11.71 2.06 8.93c1.7-1.97 4.39-3.13 6.92-3.13 1.49 0 2.5.61 3.59.61 1.07 0 1.72-.61 3.45-.61 1.4 0 2.89.76 3.95 2.07-3.47 1.9-2.91 6.85.53 8.53z" />
  </svg>
);
