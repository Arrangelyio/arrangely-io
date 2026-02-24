-- Insert sample discount codes
INSERT INTO public.discount_codes (code, discount_type, discount_value, max_uses, valid_until, is_active) VALUES 
('MAESTRO100', 'percentage', 100, 10, '2025-12-31 23:59:59+00', true), -- 100% off for maestro musicians
('HARMONY75', 'percentage', 75, 25, '2025-12-31 23:59:59+00', true), -- 75% off harmony package
('MELODY50', 'percentage', 50, 50, '2025-12-31 23:59:59+00', true), -- 50% off melody makers
('RHYTHM25', 'percentage', 25, 100, '2025-12-31 23:59:59+00', true); -- 25% off for rhythm section