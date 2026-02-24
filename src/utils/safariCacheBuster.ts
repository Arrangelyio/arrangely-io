// Safari Cache Buster - Programmatically clear all caches like Safari's "Empty Caches"
export class SafariCacheBuster {
  private static instance: SafariCacheBuster;
  private lastClearTime: number = 0;
  private readonly CLEAR_INTERVAL = 30 * 1000; // 30 seconds minimum between clears

  private constructor() {}

  public static getInstance(): SafariCacheBuster {
    if (!SafariCacheBuster.instance) {
      SafariCacheBuster.instance = new SafariCacheBuster();
    }
    return SafariCacheBuster.instance;
  }

  public isSafari(): boolean {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('chromium');
  }

  public async clearAllCaches(force: boolean = false): Promise<void> {
    if (!this.isSafari() && !force) {
      
      return;
    }

    const now = Date.now();
    if (!force && (now - this.lastClearTime) < this.CLEAR_INTERVAL) {
      
      return;
    }

    
    this.lastClearTime = now;

    try {
      // 1. Clear all localStorage
      await this.clearLocalStorage();
      
      // 2. Clear all sessionStorage  
      await this.clearSessionStorage();
      
      // 3. Clear IndexedDB
      await this.clearIndexedDB();
      
      // 4. Clear Cache API
      await this.clearCacheAPI();
      
      // 5. Clear Supabase specific caches
      await this.clearSupabaseCaches();
      
      // 6. Force reload with cache bypass
      if (window.location.pathname === '/auth') {
        await this.forceReloadWithCacheBypass();
      }
      
      
    } catch (error) {
      console.error('❌ [SafariCacheBuster] Error clearing caches:', error);
    }
  }

  private async clearLocalStorage(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      
      
      // Clear all items
      localStorage.clear();
      
      
    } catch (error) {
      console.error('[SafariCacheBuster] Error clearing localStorage:', error);
    }
  }

  private async clearSessionStorage(): Promise<void> {
    try {
      const keys = Object.keys(sessionStorage);
      
      
      // Clear all items
      sessionStorage.clear();
      
      
    } catch (error) {
      console.error('[SafariCacheBuster] Error clearing sessionStorage:', error);
    }
  }

  private async clearIndexedDB(): Promise<void> {
    try {
      if (!window.indexedDB) return;

      // Get all databases (this is limited in Safari but we try)
      const databases = ['supabase-cache', 'auth-cache', 'user-cache'];
      
      for (const dbName of databases) {
        try {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          await new Promise((resolve, reject) => {
            deleteRequest.onsuccess = () => resolve(null);
            deleteRequest.onerror = () => reject(deleteRequest.error);
            deleteRequest.onblocked = () => resolve(null); // Continue anyway
          });
          
        } catch (error) {
          
        }
      }
    } catch (error) {
      console.error('[SafariCacheBuster] Error clearing IndexedDB:', error);
    }
  }

  private async clearCacheAPI(): Promise<void> {
    try {
      if (!('caches' in window)) return;

      const cacheNames = await caches.keys();
      
      
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      
    } catch (error) {
      console.error('[SafariCacheBuster] Error clearing Cache API:', error);
    }
  }

  private async clearSupabaseCaches(): Promise<void> {
    try {
      // Clear any global Supabase state
      if (window.localStorage) {
        const keys = Object.keys(localStorage);
        const supabaseKeys = keys.filter(key => 
          key.includes('supabase') || 
          key.includes('sb-') || 
          key.includes('auth-token') ||
          key.includes('arrangely')
        );
        
        supabaseKeys.forEach(key => {
          localStorage.removeItem(key);
          
        });
      }

      // Clear session storage too
      if (window.sessionStorage) {
        const keys = Object.keys(sessionStorage);
        const supabaseKeys = keys.filter(key => 
          key.includes('supabase') || 
          key.includes('sb-') || 
          key.includes('auth-token') ||
          key.includes('arrangely')
        );
        
        supabaseKeys.forEach(key => {
          sessionStorage.removeItem(key);
          
        });
      }

      
    } catch (error) {
      console.error('[SafariCacheBuster] Error clearing Supabase caches:', error);
    }
  }

  private async forceReloadWithCacheBypass(): Promise<void> {
    try {
      
      
      // Add cache busting parameter
      const url = new URL(window.location.href);
      url.searchParams.set('_cacheBust', Date.now().toString());
      
      // Use replace to avoid history issues
      window.location.replace(url.toString());
    } catch (error) {
      console.error('[SafariCacheBuster] Error force reloading:', error);
      // Fallback to regular reload
      window.location.reload();
    }
  }

  public async clearAuthCaches(): Promise<void> {
    if (!this.isSafari()) return;

    
    
    try {
      // Clear auth-related localStorage
      const authKeys = [
        'arrangely_intended_url',
        'arrangely_intended_url_timestamp',
        'supabase.auth.token',
        'sb-jowuhdfznveuopeqwzzd-auth-token'
      ];

      authKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          
        }
      });

      // Clear any cached session data
      if (window.sessionStorage) {
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach(key => {
          if (key.includes('auth') || key.includes('session') || key.includes('supabase')) {
            sessionStorage.removeItem(key);
            
          }
        });
      }

      
    } catch (error) {
      console.error('[SafariCacheBuster] Error clearing auth caches:', error);
    }
  }
}

// Export singleton instance
export const safariCacheBuster = SafariCacheBuster.getInstance();
