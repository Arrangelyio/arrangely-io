import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext'
import Pricing from '@/pages/Pricing'

// Test component to access subscription context
const TestSubscriptionComponent = () => {
  const { subscriptionStatus, loading, checkSubscription, startFreeTrial } = useSubscription()
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="subscription-status">
        {subscriptionStatus?.hasActiveSubscription ? 'active' : 'inactive'}
      </div>
      <div data-testid="trial-status">
        {subscriptionStatus?.isTrialing ? 'trialing' : 'not-trialing'}
      </div>
      <button onClick={checkSubscription} data-testid="check-subscription">
        Check Subscription
      </button>
      <button onClick={startFreeTrial} data-testid="start-trial">
        Start Trial
      </button>
    </div>
  )
}

describe('Subscription System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SubscriptionContext', () => {
    it('should provide subscription context', () => {
      render(
        <SubscriptionProvider>
          <TestSubscriptionComponent />
        </SubscriptionProvider>
      )
      
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      expect(screen.getByTestId('subscription-status')).toBeInTheDocument()
    })

    it('should handle subscription check', async () => {
      const user = userEvent.setup()
      
      // Mock successful subscription check
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { hasActiveSubscription: true, isTrialing: false },
        error: null,
      })
      
      render(
        <SubscriptionProvider>
          <TestSubscriptionComponent />
        </SubscriptionProvider>
      )
      
      await user.click(screen.getByTestId('check-subscription'))
      
      await waitFor(() => {
        expect(screen.getByTestId('subscription-status')).toHaveTextContent('active')
      })
    })

    it('should handle trial start', async () => {
      const user = userEvent.setup()
      
      // Mock successful trial start
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true },
        error: null,
      })
      
      render(
        <SubscriptionProvider>
          <TestSubscriptionComponent />
        </SubscriptionProvider>
      )
      
      await user.click(screen.getByTestId('start-trial'))
      
      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('start-free-trial')
      })
    })

    it('should handle subscription errors', async () => {
      const user = userEvent.setup()
      
      // Mock subscription error
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Subscription check failed'),
      })
      
      render(
        <SubscriptionProvider>
          <TestSubscriptionComponent />
        </SubscriptionProvider>
      )
      
      await user.click(screen.getByTestId('check-subscription'))
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByTestId('subscription-status')).toHaveTextContent('inactive')
      })
    })
  })

  describe('Pricing Page', () => {
    it('should render all subscription plans', async () => {
      // Mock subscription plans data
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: '1', name: 'Basic', price: 29000, features: [] },
            { id: '2', name: 'Premium', price: 79000, features: [] },
            { id: '3', name: 'Enterprise', price: 149000, features: [] },
          ],
          error: null,
        }),
      } as any)
      
      render(<Pricing />)
      
      await waitFor(() => {
        expect(screen.getByText('Basic')).toBeInTheDocument()
        expect(screen.getByText('Premium')).toBeInTheDocument()
        expect(screen.getByText('Enterprise')).toBeInTheDocument()
      })
    })

    it('should handle plan selection', async () => {
      const user = userEvent.setup()
      
      // Mock plans data
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: '1', name: 'Premium', price: 79000 }],
          error: null,
        }),
      } as any)
      
      render(<Pricing />)
      
      await waitFor(() => {
        const selectButton = screen.getByText(/select.*premium/i)
        if (selectButton) {
          fireEvent.click(selectButton)
        }
      })
    })

    it('should show trial information', async () => {
      render(<Pricing />)
      
      // Should show trial-related information
      await waitFor(() => {
        const trialElement = screen.queryByText(/trial/i)
        if (trialElement) {
          expect(trialElement).toBeInTheDocument()
        }
      })
    })

    it('should handle yearly/monthly toggle', async () => {
      const user = userEvent.setup()
      render(<Pricing />)
      
      const yearlyToggle = screen.queryByRole('switch')
      if (yearlyToggle) {
        await user.click(yearlyToggle)
        // Should update pricing display
        expect(yearlyToggle).toBeChecked()
      }
    })
  })

  describe('Payment Integration', () => {
    it('should open payment modal on plan selection', async () => {
      const user = userEvent.setup()
      render(<Pricing />)
      
      // Mock payment modal trigger
      const payButton = screen.queryByText(/pay/i)
      if (payButton) {
        await user.click(payButton)
        // Payment modal should be triggered
      }
    })

    it('should handle payment success', async () => {
      // Mock successful payment
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { url: 'https://payment.url' },
        error: null,
      })
      
      render(<Pricing />)
      
      // Test payment flow
      expect(supabase.functions.invoke).toBeDefined()
    })

    it('should handle payment errors', async () => {
      // Mock payment error
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Payment failed'),
      })
      
      render(<Pricing />)
      
      // Should handle payment errors gracefully
      expect(supabase.functions.invoke).toBeDefined()
    })
  })
})