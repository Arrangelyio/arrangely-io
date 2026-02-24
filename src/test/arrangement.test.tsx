import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import ArrangementEditor from '@/components/ArrangementEditor'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ArrangementEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    })
  })

  describe('New Arrangement Creation', () => {
    it('should render initial step with song details form', () => {
      render(<ArrangementEditor />)
      
      expect(screen.getByText('Song Details')).toBeInTheDocument()
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/artist/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/key/i)).toBeInTheDocument()
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      render(<ArrangementEditor />)
      
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)
      
      // Should stay on the same step if validation fails
      expect(screen.getByText('Song Details')).toBeInTheDocument()
    })

    it('should progress through all steps', async () => {
      const user = userEvent.setup()
      render(<ArrangementEditor />)
      
      // Fill song details
      await user.type(screen.getByLabelText(/title/i), 'Test Song')
      await user.type(screen.getByLabelText(/artist/i), 'Test Artist')
      
      // Go to next step
      await user.click(screen.getByText('Next'))
      
      await waitFor(() => {
        expect(screen.getByText('Sections')).toBeInTheDocument()
      })
    })

    it('should save draft to localStorage', async () => {
      const user = userEvent.setup()
      render(<ArrangementEditor />)
      
      const titleInput = screen.getByLabelText(/title/i)
      await user.type(titleInput, 'Draft Song')
      
      // Trigger auto-save
      fireEvent.blur(titleInput)
      
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalled()
      })
    })

    it('should handle save operation', async () => {
      const user = userEvent.setup()
      render(<ArrangementEditor />)
      
      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'Test Song')
      await user.type(screen.getByLabelText(/artist/i), 'Test Artist')
      
      const saveButton = screen.getByText('Save as Draft')
      await user.click(saveButton)
      
      // Should show loading state
      expect(screen.getByText(/saving/i)).toBeInTheDocument()
    })
  })

  describe('Edit Arrangement', () => {
    const mockSongData = {
      id: '123',
      title: 'Existing Song',
      artist: 'Existing Artist',
      key: 'C',
      tempo: 120,
      time_signature: '4/4',
    }

    it('should load existing song data for editing', () => {
      render(<ArrangementEditor editingSongId="123" />)
      
      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should update save button text for editing mode', async () => {
      render(<ArrangementEditor editingSongId="123" />)
      
      await waitFor(() => {
        expect(screen.getByText('Update')).toBeInTheDocument()
      })
    })

    it('should handle update operation', async () => {
      const user = userEvent.setup()
      render(<ArrangementEditor editingSongId="123" />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Song')).toBeInTheDocument()
      })
      
      const updateButton = screen.getByText('Update')
      await user.click(updateButton)
      
      expect(screen.getByText(/updating/i)).toBeInTheDocument()
    })
  })

  describe('Import Data Handling', () => {
    const mockImportedData = {
      title: 'Imported Song',
      artist: 'Imported Artist',
      key: 'G',
      tempo: 140,
      timeSignature: '4/4',
      masterSections: {},
      arrangementSections: [],
      metadata: { confidence: 0.8, duration: '3:45', notes: [], source: 'test' },
    }

    it('should initialize with imported data', () => {
      render(<ArrangementEditor importedData={mockImportedData} />)
      
      expect(screen.getByDisplayValue('Imported Song')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Imported Artist')).toBeInTheDocument()
    })

    it('should skip initial step with imported data', () => {
      render(<ArrangementEditor importedData={mockImportedData} />)
      
      // Should go directly to sections step
      expect(screen.getByText('Sections')).toBeInTheDocument()
    })
  })

  describe('Transpose Functionality', () => {
    it('should handle transpose operation', async () => {
      const user = userEvent.setup()
      render(<ArrangementEditor />)
      
      // Mock the transpose modal trigger
      const transposeButton = screen.queryByText(/transpose/i)
      if (transposeButton) {
        await user.click(transposeButton)
        
        // Should open transpose modal
        expect(screen.getByText(/select new key/i)).toBeInTheDocument()
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock Supabase error
      const { supabase } = await import('@/integrations/supabase/client')
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: new Error('Save failed') }),
      } as any)
      
      render(<ArrangementEditor />)
      
      await user.type(screen.getByLabelText(/title/i), 'Test Song')
      await user.click(screen.getByText('Save as Draft'))
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })
    })
  })
})