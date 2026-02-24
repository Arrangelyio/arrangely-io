/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - And various other formats with query parameters
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/,
    /youtube\.com\/watch\?.*v=([^"&?\/\s]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Normalize YouTube URL to a consistent format for comparison
 */
export const normalizeYouTubeUrl = (url: string): string | null => {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
};

/**
 * Check if two YouTube URLs point to the same video
 */
export const isSameYouTubeVideo = (url1: string, url2: string): boolean => {
  const videoId1 = extractYouTubeVideoId(url1);
  const videoId2 = extractYouTubeVideoId(url2);
  return !!(videoId1 && videoId2 && videoId1 === videoId2);
};
