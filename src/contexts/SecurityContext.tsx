import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface SecurityContextType {
  isSubscriptionValid: boolean
  hasFeatureAccess: (feature: string) => Promise<boolean>
  validateLibraryLimit: () => Promise<boolean>
  refreshSecurityState: () => Promise<void>
  loading: boolean
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

interface SecurityProviderProps {
  children: ReactNode
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [isSubscriptionValid, setIsSubscriptionValid] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshSecurityState = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setIsSubscriptionValid(false)
        return
      }

      // Validate subscription server-side
      const { data, error } = await supabase.functions.invoke('validate-subscription', {
        body: { feature: 'library_access' }
      })

      if (!error && data) {
        setIsSubscriptionValid(data.hasAccess)
      } else {
        setIsSubscriptionValid(false)
      }
    } catch (error) {
      console.error('Error refreshing security state:', error)
      setIsSubscriptionValid(false)
    } finally {
      setLoading(false)
    }
  }

  const hasFeatureAccess = async (feature: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return false

      const { data, error } = await supabase.functions.invoke('validate-subscription', {
        body: { feature }
      })

      return !error && data?.hasAccess
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  const validateLibraryLimit = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return false

      const { data, error } = await supabase
        .rpc('validate_library_limit', { user_id_param: session.user.id })

      return !error && data
    } catch (error) {
      console.error('Error validating library limit:', error)
      return false
    }
  }

  useEffect(() => {
    refreshSecurityState()
  }, [])

  return (
    <SecurityContext.Provider value={{
      isSubscriptionValid,
      hasFeatureAccess,
      validateLibraryLimit,
      refreshSecurityState,
      loading
    }}>
      {children}
    </SecurityContext.Provider>
  )
}

export const useSecurity = () => {
  const context = useContext(SecurityContext)
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider')
  }
  return context
}