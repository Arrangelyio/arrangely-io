// Utility for handling redirect URLs after authentication
const INTENDED_URL_KEY = 'arrangely_intended_url';

export const storeIntendedUrl = (url: string) => {
  try {
    const path = new URL(url).pathname;
    const authRoutes = ['/auth', '/auth-callback', '/profile-setup'];

    // Skip if URL is for auth-related routes
    if (authRoutes.some(route => path.startsWith(route))) {
      
      return;
    }

    localStorage.setItem(INTENDED_URL_KEY, url);
    localStorage.setItem(INTENDED_URL_KEY + '_timestamp', Date.now().toString());
    
  } catch (error) {
    console.error('[RedirectUtils] Failed to store intended URL:', error);
  }
};

export const getIntendedUrl = (): string | null => {
  try {
    const storedUrl = localStorage.getItem(INTENDED_URL_KEY);
    
    
    // Safari-specific: Check if the stored URL is stale (older than 10 minutes)
    const timestamp = localStorage.getItem(INTENDED_URL_KEY + '_timestamp');
    if (storedUrl && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age > 10 * 60 * 1000) { // 10 minutes
        
        return null;
      }
    }
    
    return storedUrl;
  } catch (error) {
    console.error('[RedirectUtils] Failed to get intended URL:', error);
    return null;
  }
};

export const clearIntendedUrl = () => {
  try {
    localStorage.removeItem(INTENDED_URL_KEY);
    localStorage.removeItem(INTENDED_URL_KEY + '_timestamp');
    
  } catch (error) {
    console.error('[RedirectUtils] Failed to clear intended URL:', error);
  }
};

export const requiresAuthOrOnboarding = (currentPath: string): boolean => {
  const publicRoutes = [
    '/', 
    '/auth', 
    '/auth-callback', 
    '/profile-setup', 
    '/privacy', 
    '/terms', 
    '/contact',
    '/pricing',
    '/features/chord-lyric-editor',
    '/features/instant-transpose', 
    '/features/mobile-optimized',
    '/features/setlist-planner',
    '/features/team-collaboration'
  ];
  
  // Allow live preview routes (they don't require auth)
  if (currentPath.startsWith('/live-preview') || currentPath.startsWith('/setlist-performance')) {
    return false;
  }
  
  return !publicRoutes.includes(currentPath);
};

// Backward compatibility
export const shouldRedirectToAuth = requiresAuthOrOnboarding;