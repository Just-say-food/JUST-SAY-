# JUST SAY Professional Upgrade — implementation and safety roadmap

## Included in this ZIP
- Customer account page UI (email + mobile fields; does not store passwords or pretend to verify them).
- Hotel partner registration UI with city selection, document pickers, and ₹499 introductory / ₹999 standard membership display.
- Hotel room inventory and guest register prototype, including CSV export and print-to-PDF.
- Super Admin prototype settings for Lucknow/Kanpur city focus, payment receiving details, partner approval queue, and booking receipt printing.
- Public-site city selector and quick links to customer account and partner registration.
- Clear prototype warnings where real provider/backend work is still required.

## Not production-ready until these are implemented
1. Supabase Auth: verified email, phone OTP, password reset, secure sessions and role-based access. Do not use localStorage for passwords or roles.
2. Database: server-owned booking/room tables, hotel-scoped RLS, audit trail, concurrency-safe room inventory, booking status transitions, and customer-specific booking history.
3. Documents: private Storage bucket, file size/type checks, signed URL access, and policies restricting documents to uploader + authorized admins.
4. Payments: integrate a compliant payment provider (e.g. Razorpay/Cashfree) with server-side webhook verification. Admin UPI/bank details alone do not prove a payment. Never mark paid based on a screenshot or client request.
5. Receipts and notifications: server-side receipt IDs, email provider, and WhatsApp Business API/template approval. Browser print/mail/WhatsApp links are not automatic delivery.
6. Membership: provider checkout, server verification, refund/cancellation terms and invoice. The ₹499 price is only displayed in the prototype.
7. Hotel approval: application status pending until admin approval; only approved and paid/eligible partner profiles become public.
8. Data retention: role-restricted export, soft delete/archive, audit logging and retention policy. Admin clear-data actions must require confirmation and leave an audit event.
9. Multi-city: canonical city IDs, city/area coordinates, admin filters, location-aware search, and city-specific inventory/partners.

## Existing Supabase project caution
The existing project schema/policies were not changed by this ZIP. Inspect actual table definitions before applying migrations. Never expose service-role/secret keys in browser code. The current `supabase-config.js` placeholder must be set to the project's publishable key before any client connection works.
