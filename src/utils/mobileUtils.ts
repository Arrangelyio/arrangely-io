export const MOBILE_STORAGE_KEY = 'arrangely_is_mobile';

export const getMobileFromStorage = (): boolean | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(MOBILE_STORAGE_KEY);
  if (stored === null) return null;
  return stored === 'true';
};

export const setMobileInStorage = (isMobile: boolean): void => {
  if (typeof window === 'undefined') return;
  if (isMobile) {
    localStorage.setItem(MOBILE_STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(MOBILE_STORAGE_KEY);
  }
};

const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check user agent for mobile devices
  const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check viewport width (768px is typical mobile breakpoint)
  const viewportCheck = window.innerWidth <= 768;
  
  // Check if device has touch capability
  const touchCheck = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return userAgentCheck || (viewportCheck && touchCheck);
};

export const checkIsMobileView = (searchParams?: URLSearchParams): boolean => {
  const param = searchParams?.get("isMobile");

  if (param === "true") {
    setMobileInStorage(true);
    return true;
  }

  if (param === "false") {
    setMobileInStorage(false);
    return false;
  }

  // ⬇️ Default kalau param tidak ada
  setMobileInStorage(false);
  return false;
};


export const getMobileUrl = (path: string = '/'): string => {
  const url = new URL(path, window.location.origin);
  if (getMobileFromStorage()) {
    url.searchParams.set('isMobile', 'true');
  }
  return url.pathname + url.search;
};
