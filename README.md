# JUST SAY — Version 4 Hotel & Restaurant Portal Prototype

Mobile-first front-end prototype extending Version 3's Super Admin setup/login/verification demo.

## Included prototype workflows

### Customer/public portal
- Public directory of published hotel profiles.
- Room search by area and maximum nightly price, with date inputs and estimated totals.
- Room types, demo availability counts, room enquiry / booking-lead form, and estimated booking totals.
- Hotel profile sections: About, food types, multiple restaurant names, contact/service hours, menu, guest/age policy, terms, payment options and reviews.
- Menu/cart/food-order flow.
- UPI ID, UPI intent link and QR display when a hotel has configured its UPI ID. UPI payment is NOT verified by this prototype; merchant verification is required.
- Cash-at-hotel option is labelled as subject to hotel approval.
- Order/booking message templates can open the visitor's email app addressed to the central admin `anilsharma.kanpur25@gmail.com` and the hotel's configured email.
- WhatsApp handoff to the hotel's configured number. The seeded Dev Residency demo number is `+91 7376570753`.
- Rule-based AI-helpdesk-style demo for hotel counts, room-search guidance, menu listing queries and booking-process questions.

### Super Admin / hotel portal
- Version 3 Super Admin create-account, sign-in, demo verification code, and lock/logout flow retained.
- Create and edit multiple hotel profiles.
- Configure hotel contact email, WhatsApp, UPI ID, room types/prices/demo availability, food types, restaurant names, policies, terms, about text and menu.
- Generate a QR preview for each hotel listing.
- Hotel partner login, room-price editing, menu and price editing, order list, booking-lead list, reviews, and hotel QR preview.
- Admin view of locally saved hotels, orders, booking leads and reviews.

## Demo instructions
1. Extract the ZIP.
2. Open `index.html` to see the customer-facing page.
3. Open `admin.html` and create a Super Admin demo account. The verification code is displayed on screen; this is not real email delivery or MFA.
4. In the Super Admin page, create/edit a hotel. Enter the hotel's notification email, UPI ID, room types and menu details. Room field format: `Standard: 1200: 3, Deluxe: 1800: 2` (room type: price per night: demo availability).
5. Hotel owner signs in at `hotel-login.html` with the demo credentials created by Super Admin.
6. Public listing: `hotel.html?hotel=dev-residency` (or the slug of a hotel you create).
7. Use the room enquiry form, food cart, review page, room search and helpdesk on the public site.

## Important limitations — not production ready
- This is a browser-only prototype. `localStorage` is local to one browser/device; data does not sync across customer, hotel and admin devices. The demo Super Admin and hotel passwords are stored in browser storage and are not secure.
- Super Admin verification code is generated and shown in the page; no email/SMS/authenticator verification actually occurs.
- Room search uses configured demo availability; there is no inventory lock, concurrent-booking protection, calendar sync or instant confirmed reservation.
- Email actions open the user's mail app with a prefilled draft; they do not automatically send email in the background. Automated dual email needs a server/API email provider.
- WhatsApp links open WhatsApp with a prepared message; they do not automatically deliver messages in the background.
- AI helpdesk is rule-based sample logic, not a connected LLM, and cannot safely access private booking records.
- UPI QR/intent only initiates a payment flow; the site cannot verify payment. Use a payment provider with server-side webhooks or merchant-side confirmation before confirming an order.
- QR generation currently uses a third-party QR image service.
- Hotel listing photos, image uploads, credits, room inventory sync, account verification, password resets, true live updates, real AI, transactional emails, payment verification and server-side audit logs are not implemented.

## Recommended production architecture
- Static front end (Netlify or GitHub Pages) plus Supabase Auth/Postgres with Row Level Security for shared data and hotel-scoped permissions.
- Real Super Admin role enforced server-side; verified email and MFA. Never rely on front-end-only checks.
- Server/edge function for hotel creation, order/booking records, dual transactional emails, WhatsApp Business API if needed, and audit trail.
- Payment gateway with server-side webhook confirmation; do not treat screenshots, QR display or customer checkbox as payment proof.
- A real inventory model with room type, date-wise availability, booking status and transaction-safe inventory updates.
- AI chat backed by a controlled API, using only public listings by default and verified customer identity before revealing booking details.

## Hosting
Upload all files in the ZIP to the root of the existing repository. The main public page is `index.html`. If using GitHub Pages or Netlify, note that publishing the files does not add backend security or cross-device database syncing.


## Supabase connection package (added)
1. Open `supabase-config.js` and replace `PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE` with the project's **Publishable key** (`sb_publishable_...`) from Supabase → Settings → API Keys.
2. Keep the project URL already filled in. The URL is `https://okvehzycjehxbothkqwk.supabase.co`.
3. Save the file and upload all files (including `supabase-config.js` and `supabase-init.js`) to the same website root.
4. Open the site and check the connection-status notice.

### Important scope clarification
This update initializes the Supabase JavaScript client and adds a setup/status notice. It does **not yet migrate the existing hotel/menu/order/booking/review workflows or demo logins from localStorage to Supabase**. Do not use it as a production-secure portal until those operations are migrated and RLS policies are tested. The frontend must never contain an `sb_secret_...` or service-role key. Do not run destructive SQL to fix duplicate constraints.


## QR code fix (added)
- QR generation now detects when the admin/partner portal is opened directly from a local `file://` path.
- In that case it explains that the site must be hosted first instead of silently creating a QR code containing a laptop-only file URL.
- After deploying the full folder to a public HTTPS website, open the hosted `admin.html` and generate the QR codes again. Verify the public hotel link from a different phone before printing.
- This does not publish the website or create a domain automatically. The QR code will work for customers only after hosting is configured.


## Hotel and food photo gallery prototype
The admin form now includes hotel-gallery and room-gallery file selectors, and menu rows include a food-photo selector. Public hotel pages display saved hotel/room gallery images and food photos; tap a gallery image to zoom. This is a front-end prototype only: image data is stored locally in the browser demo record, not uploaded to Supabase Storage, and will not automatically appear on other devices. Before public launch, implement Supabase Storage uploads, shared hotel/room/menu records, and secure RLS policies. Do not treat booking requests as confirmed inventory reservations.


## Version 5 professional upgrade (prototype)
See `FEATURE_STATUS_V5.txt` and `PRODUCTION_ROADMAP.md`. New pages: `customer-login.html`, `hotel-register.html`, and `hotel-records.html`. A new `professional-features.js` adds local-demo admin partner approvals/payment preference fields, city selector, room/guest records, CSV export, and printable receipt. These are UI/demo workflows only; they do not replace real Supabase Auth, shared database/RLS, private Storage, payment verification, or automatic email/WhatsApp delivery.
