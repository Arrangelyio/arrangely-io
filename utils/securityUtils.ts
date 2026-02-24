// Security utilities for client-side protection

// XSS Prevention utility
export const sanitizeInput = (input: string): string => {
  if (!input) return ''
  
  // Remove script tags and event handlers
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

// HTML escape for safe rendering
export const escapeHtml = (text: string): string => {
  if (!text) return ''
  
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Rate limiting utility for client-side
class RateLimiter {
  private attempts: Map<string, number[]> = new Map()

  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, [])
    }
    
    const keyAttempts = this.attempts.get(key)!
    
    // Remove old attempts outside the window
    const recentAttempts = keyAttempts.filter(time => time > windowStart)
    
    if (recentAttempts.length >= limit) {
      return false
    }
    
    // Add current attempt
    recentAttempts.push(now)
    this.attempts.set(key, recentAttempts)
    
    return true
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }
}

export const rateLimiter = new RateLimiter()

// Content Security Policy helpers
export const validateContentType = (file: File): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'application/pdf'
  ]
  
  return allowedTypes.includes(file.type)
}

export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

// Secure API call wrapper with rate limiting
export const secureApiCall = async (
  endpoint: string,
  options: RequestInit = {},
  rateLimitKey?: string
): Promise<Response> => {
  // Apply rate limiting if key is provided
  if (rateLimitKey && !rateLimiter.isAllowed(rateLimitKey, 30, 60000)) {
    throw new Error('Rate limit exceeded. Please try again later.')
  }

  // Add security headers
  const secureHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: secureHeaders
  })

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`)
  }

  return response
}

// Input validation schemas
export const validationSchemas = {
  songTitle: {
    minLength: 1,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-.,!?()'":;&]+$/
  },
  
  artistName: {
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-.,!?'":&]+$/
  },
  
  songNotes: {
    maxLength: 1000,
    pattern: /^[a-zA-Z0-9\s\-.,!?()'":;&\n\r]+$/
  },
  
  lyrics: {
    maxLength: 5000,
    pattern: /^[a-zA-Z0-9\s\-.,!?()'":;&\n\r\[\]]+$/
  },
  
  chords: {
    maxLength: 1000,
    pattern: /^[a-zA-Z0-9\s\-.,#b/()]+$/
  }
}

export const validateInput = (
  value: string,
  schema: { minLength?: number; maxLength?: number; pattern?: RegExp }
): { isValid: boolean; error?: string } => {
  if (schema.minLength && value.length < schema.minLength) {
    return { isValid: false, error: `Minimum length is ${schema.minLength}` }
  }
  
  if (schema.maxLength && value.length > schema.maxLength) {
    return { isValid: false, error: `Maximum length is ${schema.maxLength}` }
  }
  
  if (schema.pattern && !schema.pattern.test(value)) {
    return { isValid: false, error: 'Contains invalid characters' }
  }
  
  return { isValid: true }
}