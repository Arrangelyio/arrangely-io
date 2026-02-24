// Email validation utilities

const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  'tempmail.com', 
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'moakt.com',
  'dispostable.com',
  'fakeinbox.com',
  'mailnesia.com',
  'sharklasers.com',
  'tmail.ws'
];

export const isDisposableEmail = (email: string): boolean => {
  if (!email) return false;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
};

export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  // Check for disposable email
  if (isDisposableEmail(email)) {
    return { isValid: false, error: 'Please use a permanent email address. Temporary email services are not allowed.' };
  }
  
  return { isValid: true };
};