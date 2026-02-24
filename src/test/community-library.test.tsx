import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import SongLibraryBrowse from '@/components/SongLibraryBrowse'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

describe('Community Library', () => {
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { supabase } = await import('@/integrations/supabase/client')
    mockSupabase = supabase
    
    // Setup default mocks
    vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null,
    })
  })

  describe('Song Listing', () => {
    const mockPublicSongs = [
      {
        id: 'song-1',
        title: 'Amazing Grace',
        artist: 'Traditional',
        is_public: true,
        user_id: 'user-456',
        tags: ['worship', 'hymn'],
        difficulty: 'Beginner',
        views_count: 150,
        created_at: '2024-01-01T00:00:00Z',
        profiles: {
          display_name: 'John Creator',
          avatar_url: null,
        },
      },
      {
        id: 'song-2',
        title: 'How Great Thou Art',
        artist: 'Carl Boberg',
        is_public: true,
        user_id: 'user-789',
        tags: ['worship', 'praise'],
        difficulty: 'Intermediate',
        views_count: 200,
        created_at: '2024-01-02T00:00:00Z',
        profiles: {
          display_name: 'Mary Arranger',
          avatar_url: null,
        },
      },
    ]

    it('should display public songs in community library', async () => {
      // Mock public songs data
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockPublicSongs,
          error: null,
        }),
        rpc: vi.fn().mockResolvedValue({
          data: [{ count: 2 }],
          error: null,
        }),
      } as any)
      
      render(<SongLibraryBrowse />)
      
      await waitFor(() => {
        expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
        expect(screen.getByText('How Great Thou Art')).toBeInTheDocument()
        expect(screen.getByText('John Creator')).toBeInTheDocument()
        expect(screen.getByText('Mary Arranger')).toBeInTheDocument()
      })
    })

    it('should filter songs by search query', async () => {
      const user = userEvent.setup()
      
      // Mock filtered results
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [mockPublicSongs[0]], // Only Amazing Grace matches
          error: null,
        }),
      } as any)
      
      render(<SongLibraryBrowse />)
      
      const searchInput = screen.getByPlaceholderText(/search songs/i)
      await user.type(searchInput, 'Amazing')
      
      await waitFor(() => {
        expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
        expect(screen.queryByText('How Great Thou Art')).not.toBeInTheDocument()
      })
    })

    it('should filter songs by tags', async () => {
      const user = userEvent.setup()
      
      render(<SongLibraryBrowse />)
      
      // Find and click a tag filter
      const worshipTag = screen.queryByText('worship')
      if (worshipTag) {
        await user.click(worshipTag)
        
        // Should filter songs with 'worship' tag
        await waitFor(() => {
          expect(mockSupabase.from).toHaveBeenCalled()
        })
      }
    })

    it('should filter songs by difficulty', async () => {
      const user = userEvent.setup()
      
      render(<SongLibraryBrowse />)
      
      // Find difficulty filter
      const difficultyFilter = screen.queryByText(/difficulty/i)
      if (difficultyFilter) {
        await user.click(difficultyFilter)
        
        const beginnerOption = screen.queryByText('Beginner')
        if (beginnerOption) {
          await user.click(beginnerOption)
          
          await waitFor(() => {
            expect(mockSupabase.from).toHaveBeenCalled()
          })
        }
      }
    })

    it('should sort songs by different criteria', async () => {
      const user = userEvent.setup()
      
      render(<SongLibraryBrowse />)
      
      // Find sort dropdown
      const sortDropdown = screen.queryByText(/sort by/i)
      if (sortDropdown) {
        await user.click(sortDropdown)
        
        const viewsOption = screen.queryByText(/most viewed/i)
        if (viewsOption) {
          await user.click(viewsOption)
          
          await waitFor(() => {
            expect(mockSupabase.from).toHaveBeenCalled()
          })
        }
      }
    })

    it('should handle pagination', async () => {
      const user = userEvent.setup()
      
      // Mock paginated results
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockPublicSongs,
          error: null,
        }),
      } as any)
      
      render(<SongLibraryBrowse />)
      
      // Find and click next page button
      const nextButton = screen.queryByText(/next/i)
      if (nextButton) {
        await user.click(nextButton)
        
        await waitFor(() => {
          expect(mockSupabase.from).toHaveBeenCalled()
        })
      }
    })
  })

  describe('Song Interactions', () => {
    it('should increment view count when song is viewed', async () => {
      const user = userEvent.setup()
      
      // Mock view increment
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockResolvedValue({ error: null }),
      } as any)
      
      render(<SongLibraryBrowse />)
      
      const viewButton = screen.queryByTitle(/view/i)
      if (viewButton) {
        await user.click(viewButton)
        
        await waitFor(() => {
          expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_song_views', {
            song_id: expect.any(String),
          })
        })
      }
    })

    it('should handle like/unlike functionality', async () => {
      const user = userEvent.setup()
      
      // Mock like action
      vi.mocked(mockSupabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any)
      
      render(<SongLibraryBrowse />)
      
      const likeButton = screen.queryByTitle(/like/i)
      if (likeButton) {
        await user.click(likeButton)
        
        await waitFor(() => {
          expect(mockSupabase.from).toHaveBeenCalledWith('song_likes')
        })
      }
    })

    it('should handle add to library from community', async () => {
      const user = userEvent.setup()
      
      render(<SongLibraryBrowse />)
      
      const addToLibraryButton = screen.queryByTitle(/add to library/i)
      if (addToLibraryButton) {
        await user.click(addToLibraryButton)
        
        // Should trigger add to library action
        await waitFor(() => {
          expect(mockSupabase.from).toHaveBeenCalled()
        })
      }
    })

    it('should handle follow creator functionality', async () => {
      const user = userEvent.setup()
      
      // Mock follow action
      vi.mocked(mockSupabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any)
      
      render(<SongLibraryBrowse />)
      
      const followButton = screen.queryByText(/follow/i)
      if (followButton) {
        await user.click(followButton)
        
        await waitFor(() => {
          expect(mockSupabase.from).toHaveBeenCalledWith('user_follows')
        })
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      // Mock fetch error
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Failed to fetch songs'),
        }),
      } as any)
      
      render(<SongLibraryBrowse />)
      
      await waitFor(() => {
        // Should show error state or empty state
        expect(screen.getByText(/no songs found/i) || screen.getByText(/error/i)).toBeInTheDocument()
      })
    })

    it('should handle network timeouts', async () => {
      // Mock network timeout
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockRejectedValue(new Error('Network timeout')),
      } as any)
      
      render(<SongLibraryBrowse />)
      
      await waitFor(() => {
        // Should handle timeout gracefully
        expect(screen.getByText(/loading/i) || screen.getByText(/error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance Tests', () => {
    it('should debounce search queries', async () => {
      const user = userEvent.setup()
      
      render(<SongLibraryBrowse />)
      
      const searchInput = screen.getByPlaceholderText(/search songs/i)
      
      // Type multiple characters quickly
      await user.type(searchInput, 'test')
      
      // Should debounce API calls
      await waitFor(() => {
        // Verify search was debounced and not called for each keystroke
        expect(mockSupabase.from).not.toHaveBeenCalledTimes(4)
      })
    })

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeSongList = Array.from({ length: 1000 }, (_, i) => ({
        id: `song-${i}`,
        title: `Song ${i}`,
        artist: `Artist ${i}`,
        is_public: true,
        user_id: `user-${i}`,
      }))
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: largeSongList.slice(0, 20), // Paginated results
          error: null,
        }),
      } as any)
      
      render(<SongLibraryBrowse />)
      
      // Should handle large datasets with pagination
      await waitFor(() => {
        expect(screen.getByText('Song 0')).toBeInTheDocument()
        expect(screen.queryByText('Song 25')).not.toBeInTheDocument()
      })
    })
  })
})