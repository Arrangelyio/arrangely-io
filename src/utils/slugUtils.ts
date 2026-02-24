export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 60) // Limit length for SEO
    .replace(/-$/, '') || 'item'; // Fallback if empty
};

export const generateUniqueSlug = async (
  title: string, 
  table: 'songs' | 'events' | 'setlists',
  excludeId?: string
): Promise<string> => {
  const baseSlug = generateSlug(title);
  
  // For client-side use, we'll rely on the database triggers to handle uniqueness
  // This function serves as a utility for preview/client-side slug generation
  return baseSlug;
};

// Helper to create SEO-friendly URLs with ID and slug
export const createSongUrl = (id: string, slug: string) => {
  return `/arrangement/${id}/${slug}`;
};

export const createEventUrl = (id: string, slug: string) => {
  return `/events/${id}/${slug}`;
};

export const createSetlistUrl = (id: string, slug: string) => {
  return `/setlist/${id}/${slug}`;
};

export const createLivePreviewUrl = (id: string, slug: string, songId?: string, songSlug?: string) => {
  if (songId && songSlug) {
    return `/setlist-performance/${id}/${songId}/${slug}-${songSlug}`;
  }
  return `/live-preview/${id}/${slug}`;
};