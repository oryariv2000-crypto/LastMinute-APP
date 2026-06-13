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

/** Trash can — appears in AddressBookModal, ActiveDealCard, ReviewListItem */
export const TrashIcon = ({ size = 24, ...props }) => (
  <StrokeIcon size={size} {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
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
