# Available Functions (Current Build)

Last updated: 31 March 2026
Reference scope: Based on implemented app behavior in the current codebase.

Legend:
- ✅ Available
- ⚠️ Partially Available
- ❌ Not Available Yet

## 1) Authentication Module

- ✅ User registration (email/password)
- ✅ User login (email/password)
- ✅ Remember me behavior
- ✅ Password visibility toggle (login/register)
- ✅ Session persistence
- ✅ Password reset via email
- ✅ Change password flow (profile screen)
- ⚠️ Biometric login (device support dependent)
- ⚠️ Automatic token refresh (handled by Supabase SDK defaults)
- ❌ Multi-device session management UI
- ❌ Session revocation on password change

## 2) Home Dashboard

- ✅ Basic statistics cards
- ✅ Quick navigation/actions from dashboard
- ⚠️ Recent activity feed (limited/fallback behavior)
- ✅ Analytics charts (monthly trend + tax distribution)
- ⚠️ Notifications summary (basic only)
- ❌ Advanced chart suite (pie/bar/calendar with drill-down)

## 3) Property Management

- ✅ Property list view
- ✅ Search properties
- ✅ Filter by status
- ✅ Sort properties
- ✅ Property image upload and display
- ⚠️ Pull-to-refresh behavior (basic)
- ⚠️ Property details (limited fields depending on backend data)
- ⚠️ Add property workflow (basic)
- ⚠️ Tax assessment display (basic)
- ❌ Infinite scroll pagination
- ❌ Map integration and address autocomplete
- ❌ Duplicate property detection

## 4) Tax Calculators

### Property Tax Calculator
- ✅ Property value input
- ✅ Tax rate input/selection
- ✅ Tax breakdown output
- ✅ Calculation history (save, view, re-apply, clear)
- ⚠️ Additional cess/penalty/rebate handling (basic)
- ⚠️ Save/pay integration (limited)

### Income Tax Calculator (India)
- ✅ Old vs New regime support
- ✅ Standard deduction logic
- ✅ 87A rebate handling
- ✅ Detailed slab-based breakdown
- ✅ Deduction inputs (core sections)
- ✅ Default regime preference persistence
- ✅ Calculation history (auto-save, view, re-apply, clear)
- ⚠️ Advanced deduction heads (partial)
- ⚠️ Tax-saving suggestions (basic)
- ❌ PDF export
- ❌ Full side-by-side comparison report view

## 5) Payment Processing

- ✅ Payment creation flow (app-side)
- ✅ Basic payment history list
- ✅ Receipt sharing (text share)
- ✅ PDF receipt generation and share
- ⚠️ Status handling/retry (limited)
- ⚠️ Backend write compatibility with schema-safe fields
- ❌ Real payment gateway integration (cards/net banking/wallet)
- ❌ Recurring auto-pay
- ❌ Refund tracking
- ❌ Bulk payment

## 6) User Profile

- ✅ View profile info
- ✅ Edit profile basics (name/phone/address) with local persistence
- ✅ Dark/Light mode toggle with persistence
- ✅ Notification toggle persistence
- ✅ Test notification trigger from profile
- ✅ Default tax regime selection persistence
- ✅ Help/Support and legal actions (in-app actions)
- ⚠️ Security center depth (basic)
- ❌ PAN/Aadhaar management
- ❌ Profile picture upload
- ❌ Account deletion
- ❌ 2FA setup
- ❌ Active session list and login history

## 7) Platform and Reliability

- ✅ Environment-based Supabase configuration
- ✅ Missing-table fallback behavior in key screens
- ✅ Local notification scheduling for due reminders
- ⚠️ Remote push notifications (requires development build; not Expo Go Android)
- ⚠️ Realtime updates (limited)
- ❌ Full offline mode with queued sync
- ❌ Sentry integration
- ❌ Firebase analytics integration
- ❌ Multi-language support

## Notes

- Current Supabase project still needs schema/table creation for full live-data demo.
- Some features marked partial depend on backend table availability in Supabase.
- If the database schema is not fully created, app fallbacks are used where implemented.
- This file tracks practical feature availability, not only planned items.
