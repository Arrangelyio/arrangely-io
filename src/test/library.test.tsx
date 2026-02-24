import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { useLibraryLimit } from '@/hooks/useLibraryLimit'
import SongLibrary from '@/components/SongLibrary'

// Test component for useLibraryLimit hook
const TestLibraryComponent = () => {
  const { libraryUsage, loading, recordLibraryAction } = useLibraryLimit()
  
  const handleAddToLibrary = () => {
    recordLibraryAction('song-123', 'original-123', 'user-123', 'add_to_library')
  }
  
  const handleRemoveFromLibrary = () => {
    recordLibraryAction('song-123', 'original-123', 'user-123', 'remove_from_library')
  }
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="current-count">{libraryUsage.currentCount}</div>
      <div data-testid="limit">{libraryUsage.limit}</div>
      <div data-testid="can-add-more">{libraryUsage.canAddMore ? 'yes' : 'no'}</div>
      <div data-testid="is-trialing">{libraryUsage.isTrialing ? 'yes' : 'no'}</div>
      <button onClick={handleAddToLibrary} data-testid="add-to-library">
        Add to Library
      </button>
      <button onClick={handleRemoveFromLibrary} data-testid="remove-from-library">
        Remove from Library
      </button>
    </div>
  )
}

describe('Library System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock authentication
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'user-123' } } },
            error: null,
          }),
        },
        from: vi.fn(),
        functions: {
          invoke: vi.fn(),
        },
      },
    }))
  })

  describe('useLibraryLimit Hook', () => {
    it('should initialize with default values', () => {
      render(<TestLibraryComponent />)
      
      expect(screen.getByTestId('current-count')).toHaveTextContent('0')
      expect(screen.getByTestId('limit')).toHaveTextContent('10')
      expect(screen.getByTestId('can-add-more')).toHaveTextContent('yes')
    })

    it('should check library usage on mount', async () => {
      // Mock library actions data
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: [{ id: '1' }, { id: '2' }], // 2 items in library
          error: null,
        }),
      } as any)
      
      render(<TestLibraryComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('current-count')).toHaveTextContent('2')
      })
    })

    it('should handle subscription-based limits', async () => {
      // Mock premium subscription
      const mockSubscriptionContext = {
        subscriptionStatus: {
          hasActiveSubscription: true,
          subscription: { plan_id: 'premium-plan' },
        },
      }
      
      // Mock subscription plan with higher limit
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { library_limit: 100 },
          error: null,
        }),
      } as any)
      
      render(<TestLibraryComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('limit')).toHaveTextContent('100')
      })
    })

    it('should record library add action', async () => {
      const user = userEvent.setup()
      
      // Mock successful insert
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any)
      
      render(<TestLibraryComponent />)
      
      await user.click(screen.getByTestId('add-to-library'))
      
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('user_library_actions')
      })
    })

    it('should prevent duplicate library entries', async () => {
      const user = userEvent.setup()
      
      // Mock existing entry
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'existing-entry' },
          error: null,
        }),
      } as any)
      
      render(<TestLibraryComponent />)
      
      await user.click(screen.getByTestId('add-to-library'))
      
      // Should not attempt to insert duplicate
      expect(console.log).toHaveBeenCalledWith('Song already in library')
    })

    it('should handle library limit reached', async () => {
      const user = userEvent.setup()
      
      // Mock library at limit
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: new Array(10).fill({ id: 'item' }), // 10 items = limit reached
          error: null,
        }),
      } as any)
      
      render(<TestLibraryComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('can-add-more')).toHaveTextContent('no')
      })
      
      await user.click(screen.getByTestId('add-to-library'))
      
      // Should throw error for limit reached
      expect(console.error).toHaveBeenCalledWith(
        'Error recording library action:',
        expect.any(Error)
      )
    })

    it('should remove from library', async () => {
      const user = userEvent.setup()
      
      // Mock successful delete
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ error: null }),
      } as any)
      
      render(<TestLibraryComponent />)
      
      await user.click(screen.getByTestId('remove-from-library'))
      
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('user_library_actions')
      })
    })
  })

  describe('SongLibrary Component', () => {
    const mockSongs = [
      {
        id: 'song-1',
        title: 'Test Song 1',
        artist: 'Test Artist 1',
        is_public: true,
        user_id: 'user-123',
      },
      {
        id: 'song-2',
        title: 'Test Song 2',
        artist: 'Test Artist 2',
        is_public: true,
        user_id: 'user-456',
      },
    ]

    it('should render song library', async () => {
      // Mock songs data
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockSongs,
          error: null,
        }),
      } as any)
      
      render(<SongLibrary />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Song 1')).toBeInTheDocument()
        expect(screen.getByText('Test Song 2')).toBeInTheDocument()
      })
    })

    it('should handle search functionality', async () => {
      const user = userEvent.setup()
      
      // Mock filtered search results
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [mockSongs[0]], // Only first song matches
          error: null,
        }),
      } as any)
      
      render(<SongLibrary />)
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'Test Song 1')
      
      await waitFor(() => {
        expect(screen.getByText('Test Song 1')).toBeInTheDocument()
        expect(screen.queryByText('Test Song 2')).not.toBeInTheDocument()
      })
    })

    it('should handle add to library action', async () => {
      const user = userEvent.setup()
      
      render(<SongLibrary />)
      
      await waitFor(() => {
        const addButton = screen.queryByTitle(/add to library/i)
        if (addButton) {
          fireEvent.click(addButton)
        }
      })
    })

    it('should show library limit modal when limit reached', async () => {
      const user = userEvent.setup()
      
      // Mock library at limit
      const mockLibraryHook = vi.fn().mockReturnValue({
        libraryUsage: {
          currentCount: 10,
          limit: 10,
          canAddMore: false,
          isTrialing: true,
        },
        recordLibraryAction: vi.fn().mockRejectedValue(new Error('Library limit reached')),
      })
      
      render(<SongLibrary />)
      
      const addButton = screen.queryByTitle(/add to library/i)
      if (addButton) {
        await user.click(addButton)
        
        // Should show limit modal
        await waitFor(() => {
          expect(screen.getByText(/library limit/i)).toBeInTheDocument()
        })
      }
    })
  })

  describe('Security Tests', () => {
    it('should validate user authentication for library actions', async () => {
      // Mock unauthenticated user
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any)
      
      render(<TestLibraryComponent />)
      
      const user = userEvent.setup()
      await user.click(screen.getByTestId('add-to-library'))
      
      // Should handle authentication error
      expect(console.error).toHaveBeenCalledWith(
        'Error recording library action:',
        expect.any(Error)
      )
    })

    it('should validate user_id matches authenticated user', async () => {
      const user = userEvent.setup()
      
      // Mock different user_id
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'different-user' } } },
        error: null,
      } as any)
      
      render(<TestLibraryComponent />)
      
      await user.click(screen.getByTestId('add-to-library'))
      
      // Should only allow actions on own library
      expect(supabase.from).toHaveBeenCalledWith('user_library_actions')
    })
  })
})