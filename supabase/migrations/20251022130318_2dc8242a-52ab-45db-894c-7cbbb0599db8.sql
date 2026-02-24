-- Update the default certificate template with proper settings
UPDATE public.certificate_templates
SET 
  name = 'Professional Certificate Template',
  background_image_url = '/certificate-backgrounds/default-template.jpg',
  participant_name_x = 420,
  participant_name_y = 340,
  participant_name_size = 36,
  participant_name_color = '#1a1a1a',
  lesson_title_x = 420,
  lesson_title_y = 460,
  lesson_title_size = 22,
  lesson_title_color = '#64C8B4',
  creator_name_x = 420,
  creator_name_y = 560,
  creator_name_size = 16,
  creator_name_color = '#4a4a4a'
WHERE is_default = true;