-- Enable camera recording for some sample lessons
-- Enable for first content item in each lesson (the preview ones)

UPDATE lesson_content
SET enable_camera_recording = true
WHERE is_preview = true
AND content_type = 'video';