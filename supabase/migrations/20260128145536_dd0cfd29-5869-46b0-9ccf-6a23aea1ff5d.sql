-- Insert Creator Pro plan (monthly)
INSERT INTO subscription_plans (
  name,
  price,
  currency,
  interval_type,
  interval_count,
  library_limit,
  features,
  is_active,
  is_production
) VALUES (
  'Creator Pro',
  49000,
  'IDR',
  'month',
  1,
  999999,
  jsonb_build_object(
    'youtube_imports_limit', 999999,
    'pdf_exports_limit', 999999,
    'earn_per_song_published', 5000,
    'earn_per_library_add', 250,
    'includes_premium', true,
    'marketplace_access', true,
    'reputation_system', true
  ),
  true,
  true
);

-- Insert Creator Pro plan (yearly)
INSERT INTO subscription_plans (
  name,
  price,
  currency,
  interval_type,
  interval_count,
  library_limit,
  features,
  is_active,
  is_production
) VALUES (
  'Creator Pro',
  449000,
  'IDR',
  'year',
  1,
  999999,
  jsonb_build_object(
    'youtube_imports_limit', 999999,
    'pdf_exports_limit', 999999,
    'earn_per_song_published', 5000,
    'earn_per_library_add', 250,
    'includes_premium', true,
    'marketplace_access', true,
    'reputation_system', true
  ),
  true,
  true
);