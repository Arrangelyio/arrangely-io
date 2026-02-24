import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { sanitizeInput, validateInput, validationSchemas } from '../../utils/securityUtils'

interface SecureInputProps {
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'textarea'
  validationType?: keyof typeof validationSchemas
  placeholder?: string
  className?: string
  disabled?: boolean
  maxLength?: number
}

export const SecureInput: React.FC<SecureInputProps> = ({
  value,
  onChange,
  type = 'text',
  validationType,
  placeholder,
  className,
  disabled,
  maxLength,
}) => {
  const [error, setError] = useState<string>('')
  const [sanitizedValue, setSanitizedValue] = useState(value)

  useEffect(() => {
    setSanitizedValue(sanitizeInput(value))
  }, [value])

  const handleChange = (newValue: string) => {
    // Sanitize input
    const sanitized = sanitizeInput(newValue)
    setSanitizedValue(sanitized)

    // Validate input
    if (validationType) {
      const schema = validationSchemas[validationType]
      const validation = validateInput(sanitized, schema)
      
      if (!validation.isValid) {
        setError(validation.error || 'Invalid input')
      } else {
        setError('')
      }
    }

    // Apply maxLength if specified
    if (maxLength && sanitized.length > maxLength) {
      setError(`Maximum length is ${maxLength} characters`)
      return
    }

    onChange(sanitized)
  }

  const commonProps = {
    value: sanitizedValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
      handleChange(e.target.value),
    placeholder,
    className: `${className} ${error ? 'border-red-500' : ''}`,
    disabled,
    maxLength,
  }

  return (
    <div className="space-y-1">
      {type === 'textarea' ? (
        <Textarea {...commonProps} />
      ) : (
        <Input {...commonProps} />
      )}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}