# Demo-Ready Checklist

Date: 31 March 2026

## 1) Database Fully Seeded With Demo Data
Status: ⚠️ Blocked by missing schema in current Supabase project.

Evidence:
- App-side table checks currently return `PGRST205` for `users`, `properties`, `taxes`, and `payments`.
- Seed script exists: `app/database/demo_seed.sql`.
- Schema script exists: `app/database/schema.sql`.

Action required before demo:
1. Run `app/database/schema.sql` in Supabase SQL Editor.
2. Run `app/database/demo_seed.sql` in Supabase SQL Editor.
3. Re-run app and refresh dashboard/payments/properties.

## 2) Property Images Can Be Added/Displayed
Status: ✅ Ready

Implemented in:
- `app/src/screens/PropertiesScreen.js`

Behavior:
- Camera button opens gallery picker.
- Selected image displays on property card.
- Image is persisted locally (AsyncStorage) and restored on next app launch.

## 3) PDF Receipts Can Be Generated
Status: ✅ Ready

Implemented in:
- `app/src/screens/PaymentsScreen.js`

Dependencies:
- `expo-print`
- `expo-sharing`

Behavior:
- Tap `PDF RECEIPT` on a payment row to generate and share a PDF receipt.
- Long-press keeps quick text share as fallback.

## 4) Push Notifications Can Be Sent (Simple)
Status: ✅ Ready (local reminders)

Implemented in:
- `app/src/services/notifications.js`
- `app/src/screens/ProfileScreen.js`
- `app/App.js`

Behavior:
- Notification permission flow in profile.
- `Test Notification` action sends a local notification after a short delay.
- Tax due reminders are scheduled locally.

Note:
- Remote push tokens are not supported in Android Expo Go (SDK 53+). Local demo notifications are working.

## 5) At Least One Chart Showing Tax Trends
Status: ✅ Ready

Implemented in:
- `app/src/screens/HomeScreen.js`

Charts available:
- Monthly Payment Trend (line chart)
- Tax Distribution (paid/pending/overdue)

---

## Client Demo Flow (Recommended)
1. Open Home screen and show analytics charts.
2. Open Properties and upload one image.
3. Open Payments and generate PDF receipt.
4. Open Profile and trigger test notification.
5. If DB schema has been applied, show real seeded data in properties/payments.
