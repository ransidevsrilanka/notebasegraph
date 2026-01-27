-- ============================================================
-- NOTEBASE DATABASE EXPORT
-- Generated: 2026-01-27
-- ============================================================

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Existing buckets:
-- 1. join-receipts (private)
-- 2. notes (private) - NOT cleared during purge
-- 3. print-receipts (private)
-- 4. upgrade-receipts (private)
-- 5. withdrawal-receipts (public)

INSERT INTO storage.buckets (id, name, public) VALUES
  ('join-receipts', 'join-receipts', false),
  ('notes', 'notes', false),
  ('print-receipts', 'print-receipts', false),
  ('upgrade-receipts', 'upgrade-receipts', false),
  ('withdrawal-receipts', 'withdrawal-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- USERS (from auth.users)
-- ============================================================
-- User: ransibeats@gmail.com (Super Admin)
--   ID: 1d86b468-cf17-48eb-ac34-0beb1656e880
--   Created: 2026-01-02
--   Role: super_admin
--
-- User: evin@notebase.tech (CMO - Head Ops)
--   ID: 16b71c78-9467-49f5-9cb0-27c66219499e
--   Created: 2026-01-22
--   Role: cmo
--
-- User: demologin@notebase.tech
--   ID: 66b987c4-8d75-4a63-954d-0351265bde23
--   Created: 2026-01-23
--
-- User: demologinsithum@notebase.tech
--   ID: c50026ce-69cc-4ff3-9d95-1cc0faaa89ae
--   Created: 2026-01-24
--
-- User: abc@gmail.com
--   ID: 9e86bd13-d35c-49ef-8e83-e60c57a3023d
--   Created: 2026-01-24

-- ============================================================
-- USER ROLES
-- ============================================================
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
  ('7628d1ff-7fa3-44e8-b2de-0d99913a17e5', '1d86b468-cf17-48eb-ac34-0beb1656e880', 'super_admin', '2026-01-02 09:32:03.948003+00'),
  ('dcfb0142-e4a9-4711-9ed1-60dd7c91b617', '16b71c78-9467-49f5-9cb0-27c66219499e', 'cmo', '2026-01-22 19:56:12.544105+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CMO PROFILES
-- ============================================================
INSERT INTO public.cmo_profiles (id, user_id, display_name, referral_code, is_active, is_head_ops, created_at) VALUES
  ('90860cf5-94f4-4050-81a1-681ad00da4ee', 'e7137bd0-0266-4878-95c1-0e36f635313c', 'Nisadu Sahansith Perera', 'NISADU-CMO', true, false, '2026-01-03 17:37:32.132232+00'),
  ('ad68fb69-295f-4ed1-a29c-3b81ae61a6d2', 'c4f304e3-ba86-4ef9-a61a-2ebf536b6598', 'Nimsha', 'NIMSHA-CMO', false, false, '2026-01-03 04:20:32.527072+00'),
  ('f79da9ce-6874-4c39-9ca0-57fbf0a86be2', '16b71c78-9467-49f5-9cb0-27c66219499e', 'Evin Cooray', 'EVIN-CMO', true, true, '2026-01-03 12:20:27.909735+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMMISSION TIERS
-- ============================================================
INSERT INTO public.commission_tiers (id, tier_level, tier_name, monthly_user_threshold, commission_rate, created_at, updated_at) VALUES
  ('29ccb7a6-7e8a-4ba2-988b-c7ab4fe90f2a', 1, 'Base', 0, 8.00, '2026-01-05 11:29:11.159274+00', '2026-01-05 11:29:11.159274+00'),
  ('844633b1-f744-40b3-a431-50cd6e70622b', 2, 'Tier 2', 100, 12.00, '2026-01-05 11:29:11.159274+00', '2026-01-05 11:29:11.159274+00'),
  ('7a3cf81d-32d2-4266-a7ee-9d8a321c6712', 3, 'Tier 3', 250, 15.00, '2026-01-05 11:29:11.159274+00', '2026-01-05 11:29:11.159274+00'),
  ('dab406cd-0816-4146-b535-ed9213b57693', 4, 'Tier 4', 500, 20.00, '2026-01-05 11:29:11.159274+00', '2026-01-13 14:28:10.672005+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CMO TARGETS
-- ============================================================
INSERT INTO public.cmo_targets (id, phase, creators_target, users_per_creator_target, created_at) VALUES
  ('355a71f9-1ceb-43dc-8f54-95e9585c7ab7', 1, 50, 20, '2026-01-04 08:50:53.454328+00'),
  ('bd4e272c-f4f4-4b8e-a49e-b1573de255dd', 2, 100, 50, '2026-01-04 08:50:53.454328+00'),
  ('ede34c62-37ff-4187-8017-79cd4e749158', 3, 180, 100, '2026-01-04 08:50:53.454328+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BUSINESS PHASES
-- ============================================================
INSERT INTO public.business_phases (id, phase_name, current_phase, updated_at, updated_by) VALUES
  ('341f64d3-1d06-484f-ae92-f1c1ac533205', 'Pre-Launch', 1, '2026-01-04 08:50:53.454328+00', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PLATFORM SETTINGS
-- ============================================================
INSERT INTO public.platform_settings (id, setting_key, setting_value, updated_at, updated_by) VALUES
  ('2e2cbb56-35b6-41c6-ae93-b73c674fdbb3', 'minimum_payout_lkr', '10000', '2026-01-05 11:29:11.159274+00', NULL),
  ('ef1f010d-fa8b-4d19-affc-9b04acce30bd', 'withdrawal_fee_percent', '3', '2026-01-05 11:29:11.159274+00', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PRINT SETTINGS
-- ============================================================
INSERT INTO public.print_settings (id, notes_price_per_page, model_paper_price_per_page, base_delivery_fee, cod_extra_fee, is_active, created_at, updated_at) VALUES
  ('8271befe-e9cf-48db-a25c-761724c445f7', 5, 8, 200, 50, true, '2026-01-26 04:47:20.82144+00', '2026-01-26 04:47:20.82144+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SITE SETTINGS
-- ============================================================
INSERT INTO public.site_settings (id, key, value, created_at, updated_at) VALUES
  ('bc9caa37-a513-4697-96dc-10031739d9c2', 'branding', '{"bankDetails":{"accountName":"L G SILVA","accountNumber":"107158823715","bankName":"National Savings Bank (NSB)","branch":"Wadduwa"},"heading":"Notebase","logoImage":null,"logoText":"","pricingButtons":{"lifetime":"/access","standard":"/access","starter":"/access"},"siteName":"Notebase","tagline":"Stream-based access to curated notes, past papers, and study materials. One code unlocks your entire curriculum."}', '2026-01-08 14:34:55.218701+00', '2026-01-16 13:39:49.435594+00'),
  ('912cc7c1-edae-46ed-986c-45ddaeacf177', 'download_settings', '{"disabledUsers":[],"globalEnabled":true}', '2026-01-04 08:50:53.454328+00', '2026-01-04 08:50:53.454328+00'),
  ('be9a0c63-5c27-4ba8-a88f-ef0186c763d8', 'payment_mode', '{"mode":"live","test_environment":"web"}', '2026-01-03 04:52:34.557838+00', '2026-01-21 05:29:09.39636+00'),
  ('20397c12-b116-4709-a102-7a862fc3753b', 'pricing', '{"lifetime":{"description":"Ultimate lifetime access","features":["All Gold features","Lifetime access","Exclusive content","VIP support","Early access"],"name":"Platinum","period":"Forever","price":2800},"standard":{"description":"Enhanced learning experience","features":["All Silver features","Premium content","Priority support","Study guides"],"name":"Gold","period":"1 year","price":1700},"starter":{"description":"Essential access for students","features":["Access to all notes","Past papers","Basic support"],"name":"Silver","period":"1 year","price":30}}', '2026-01-03 04:26:54.04605+00', '2026-01-26 04:00:04.510286+00'),
  ('1673cc08-863f-4949-aaab-4d94244b932f', 'bank_details', '{"account_holder":"Notebase Labs Pvt Ltd","account_number":"107158823715","bank_name":"National Savings Bank","branch_name":"Wadduwa"}', '2026-01-26 16:30:25.613834+00', '2026-01-26 16:30:25.613834+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PROFILES (Active)
-- ============================================================
INSERT INTO public.profiles (id, user_id, email, full_name, referral_code, is_locked, abuse_flags, max_devices, downloads_disabled, created_at, updated_at) VALUES
  ('fa350d94-1164-408f-856a-f82f24878417', 'fa350d94-1164-408f-856a-f82f24878417', 'abd@gmail.com', 'Sithum Ransi Fernando', 'USRFA350D94', false, 0, 3, false, '2026-01-27 04:13:12.709138+00', '2026-01-27 04:13:13.32959+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ACCESS CODES (Sample)
-- ============================================================
INSERT INTO public.access_codes (id, code, tier, status, grade, stream, medium, duration_days, activation_limit, activations_used, created_by, created_at, updated_at) VALUES
  ('e37ac125-5de7-43c4-a2f4-4b961077f0be', 'SV-D0XDBI8X', 'standard', 'revoked', 'al_grade13', 'maths', 'english', 2, 1, 0, '1d86b468-cf17-48eb-ac34-0beb1656e880', '2026-01-16 17:15:52.186318+00', '2026-01-27 04:09:47.611658+00'),
  ('93efa3f3-d986-4061-8790-7e7acff55a01', 'SV-KZMH6OED', 'standard', 'revoked', 'al_grade13', 'maths', 'english', 365, 1, 0, '1d86b468-cf17-48eb-ac34-0beb1656e880', '2026-01-22 07:45:44.097057+00', '2026-01-27 04:09:42.886704+00'),
  ('13714b39-f8cd-4832-b035-035a929d1324', 'SV-9CDPPH0Z', 'standard', 'revoked', 'al_grade13', 'maths', 'english', 365, 1, 0, '1d86b468-cf17-48eb-ac34-0beb1656e880', '2026-01-22 14:14:45.288728+00', '2026-01-27 04:09:41.055284+00'),
  ('a56bc257-b9a9-408e-8c7f-fa0a74b0e78c', 'SV-PU3DWUVD', 'standard', 'revoked', 'al_grade13', 'maths', 'english', 365, 1, 0, '1d86b468-cf17-48eb-ac34-0beb1656e880', '2026-01-27 03:37:33.02736+00', '2026-01-27 04:09:38.872862+00'),
  ('b6b0fb23-e720-4a9e-912e-55f3eaf126ca', 'SV-25GWGRZF', 'standard', 'active', 'al_grade13', 'maths', 'english', 365, 1, 0, '1d86b468-cf17-48eb-ac34-0beb1656e880', '2026-01-27 04:09:50.04959+00', '2026-01-27 04:09:50.04959+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ENROLLMENTS (Active)
-- ============================================================
INSERT INTO public.enrollments (id, user_id, access_code_id, grade, stream, medium, tier, is_active, expires_at, payment_order_id, upgrade_celebrated, created_at, updated_at) VALUES
  ('f9983cd7-5929-4a7e-a72f-b3ca8b7a69fe', '6fd92846-65d3-49cc-9858-c12ef38da481', NULL, 'al_grade13', 'maths', 'english', 'starter', true, '2027-01-16 16:14:46.391+00', 'ORD-1768580013827-xhwvvot55', false, '2026-01-16 16:14:48.680017+00', '2026-01-16 16:14:48.680017+00'),
  ('808011ea-26fb-4ac5-8ca9-38e3f879891d', '9aa8d856-3b94-4cc0-ad8e-25914b980ef8', NULL, 'al_grade13', 'arts', 'english', 'starter', true, '2027-01-20 21:23:43.474+00', 'ORD-1768944163729-uvd9isob9', false, '2026-01-20 21:23:43.519561+00', '2026-01-20 21:23:43.519561+00'),
  ('9ca3e859-16c0-4068-bf1d-fa424723ca34', '5578e875-7437-44ab-9294-4ff280bce583', NULL, 'al_grade12', 'technology', 'english', 'lifetime', true, NULL, 'ORD-1768944272456-xb8po7kxt', false, '2026-01-20 21:25:10.296136+00', '2026-01-20 21:25:10.296136+00'),
  ('af58e419-8ce8-4c6d-a12f-d6bdef9368f0', 'c50026ce-69cc-4ff3-9d95-1cc0faaa89ae', '13714b39-f8cd-4832-b035-035a929d1324', 'al_grade13', 'maths', 'english', 'standard', true, '2027-01-24 04:11:20.866+00', NULL, false, '2026-01-24 04:11:21.227878+00', '2026-01-24 04:11:21.227878+00'),
  ('5b1e35a2-ad08-4628-a483-10ea133d35ff', '9e86bd13-d35c-49ef-8e83-e60c57a3023d', NULL, 'al_grade12', 'maths', 'english', 'standard', true, '2027-01-24 08:42:04.573+00', 'BANK-J4409', false, '2026-01-24 08:42:04.693096+00', '2026-01-24 08:42:04.693096+00'),
  ('5584ea49-719d-4441-98d7-6cfdfbd32504', '66b987c4-8d75-4a63-954d-0351265bde23', NULL, 'al_grade12', 'maths', 'english', 'lifetime', true, NULL, 'BANK-J4344', false, '2026-01-23 07:46:37.050518+00', '2026-01-26 17:04:09.568379+00'),
  ('3546aee5-8707-461a-bd5d-5c11dbdc228e', '76f4db9e-a268-4526-a8df-864f1dfc2cf8', 'a56bc257-b9a9-408e-8c7f-fa0a74b0e78c', 'al_grade13', 'maths', 'english', 'standard', true, '2027-01-27 03:38:06.233+00', NULL, false, '2026-01-27 03:38:00.645043+00', '2026-01-27 03:38:00.645043+00'),
  ('7f9e9016-c731-4b6d-9155-21d93da4854f', 'fa350d94-1164-408f-856a-f82f24878417', NULL, 'al_grade12', 'maths', 'english', 'starter', true, '2027-01-27 04:13:29.502+00', 'ORD-1769487062668-wd2zuaaoc', false, '2026-01-27 04:13:24.072972+00', '2026-01-27 04:13:24.072972+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- EDGE FUNCTIONS
-- ============================================================
-- Located in: supabase/functions/
-- Functions:
--   1. admin-finance       - Finance operations and OTP verification
--   2. admin-purge-data    - Data purge with storage cleanup
--   3. ai-chat             - AI chat functionality
--   4. calculate-print-price - Print pricing calculator
--   5. evaluate-creator-tiers - Creator tier evaluation
--   6. payhere-checkout    - PayHere payment integration
--   7. payhere-refund      - PayHere refund processing
--   8. process-withdrawal  - Withdrawal processing
--   9. send-telegram-document - Telegram document notifications
--  10. send-telegram-notification - Telegram notifications
--  11. send-upgrade-telegram - Upgrade notifications
--  12. serve-pdf           - PDF serving with watermarks

-- ============================================================
-- TABLE SCHEMA SUMMARY
-- ============================================================
-- Total Tables: 47
-- 
-- Core Tables:
--   - access_codes          : Access code management
--   - admin_actions         : Admin audit trail
--   - ai_chat_messages      : AI chat history
--   - ai_credits            : AI usage credits
--   - business_phases       : Business phase tracking
--   - cmo_payouts           : CMO payout records
--   - cmo_profiles          : CMO profiles
--   - cmo_targets           : CMO targets by phase
--   - commission_tiers      : Creator commission tiers
--   - content               : General content
--   - creator_onboarding    : Creator onboarding progress
--   - creator_payouts       : Creator payout records
--   - creator_profiles      : Creator profiles
--   - discount_codes        : Discount codes
--   - download_logs         : Download audit logs
--   - enrollments           : User enrollments
--   - flashcard_progress    : Flashcard learning progress
--   - flashcard_sets        : Flashcard sets
--   - flashcards            : Individual flashcards
--   - head_ops_requests     : Head ops requests
--   - join_requests         : Join/signup requests
--   - messages              : System messages/inbox
--   - notes                 : Study notes/PDFs
--   - payment_attributions  : Payment attribution tracking
--   - payments              : Payment records
--   - pending_payments      : Pending payment records
--   - platform_settings     : Platform configuration
--   - print_request_items   : Print request items
--   - print_requests        : Print requests
--   - print_settings        : Print pricing settings
--   - profiles              : User profiles
--   - question_bank         : Quiz questions
--   - quiz_attempts         : Quiz attempt history
--   - quizzes               : Quiz definitions
--   - referral_rewards      : Referral reward tracking
--   - site_settings         : Site configuration
--   - stream_subjects       : Stream subject definitions
--   - subject_medium_requests: Medium change requests
--   - subjects              : Subject definitions
--   - topics                : Topic definitions
--   - upgrade_requests      : Tier upgrade requests
--   - user_attributions     : User attribution tracking
--   - user_roles            : User role assignments
--   - user_sessions         : User session tracking
--   - user_subjects         : User subject selections
--   - withdrawal_methods    : Withdrawal method configs
--   - withdrawal_requests   : Withdrawal requests

-- ============================================================
-- SECRETS (Names only - values stored securely)
-- ============================================================
-- TELEGRAM_BOT_TOKEN
-- SUPABASE_URL
-- SUPABASE_SERVICE_ROLE_KEY
-- SUPABASE_PUBLISHABLE_KEY
-- REFUND_OTP_CODE
-- TELEGRAM_CHAT_ID
-- PAYHERE_MERCHANT_ID
-- DO_AGENT_ACCESS_KEY
-- PAYHERE_MERCHANT_SANDOBOX_ID
-- PAYHERE_SANDBOX_APP_ID
-- LOVABLE_API_KEY
-- PAYHERE_MERCHANT_SANDBOX_SECRET_WEB
-- PAYHERE_MERCHANT_SECRET
-- PAYHERE_SANDBOX_APP_SECRET
-- PAYHERE_APP_ID
-- PAYHERE_APP_SECRET
-- SUPABASE_ANON_KEY
-- SUPABASE_DB_URL
-- PAYHERE_MERCHANT_SECRET_SANDBOX_LOCALHOST

-- ============================================================
-- END OF EXPORT
-- ============================================================
