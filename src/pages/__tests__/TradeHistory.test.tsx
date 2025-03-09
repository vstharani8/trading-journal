import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import TradeHistory from '../TradeHistory'
import { db } from '../../services/supabase'

// Mock the supabase service
jest.mock('../../services/supabase', () => ({
  db: {
    getAllTrades: jest.fn(),
    getUserSettings: jest.fn(),
    deleteTrade: jest.fn(),
    supabase: {
      auth: {
        getSession: jest.fn()
      }
    }
  }
}))

const mockTrades = [
  {
    id: '1',
    symbol: 'AAPL',
    type: 'long',
    entry_price: 150,
    exit_price: 160,
    quantity: 10,
    status: 'closed',
    entry_date: '2024-01-01',
    strategy: 'Swing Trading',
    stop_loss: 145,
    take_profit: 165
  },
  {
    id: '2',
    symbol: 'GOOGL',
    type: 'short',
    entry_price: 2800,
    exit_price: null,
    quantity: 5,
    status: 'open',
    entry_date: '2024-01-02',
    strategy: 'Day Trading',
    stop_loss: 2850,
    take_profit: 2750
  }
]

const mockUserSettings = {
  total_capital: 100000,
  risk_per_trade: 1,
  default_position_size: 2
}

describe('TradeHistory Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    
    // Setup default mock implementations
    ;(db.getAllTrades as jest.Mock).mockResolvedValue(mockTrades)
    ;(db.getUserSettings as jest.Mock).mockResolvedValue(mockUserSettings)
    ;(db.supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'test-user-id' } } }
    })
  })

  test('renders trade history page with trades', async () => {
    render(
      <BrowserRouter>
        <TradeHistory />
      </BrowserRouter>
    )

    // Wait for trades to load and check heading
    await waitFor(() => {
      expect(screen.getByText('Trade History')).toBeInTheDocument()
    })

    // Check if trades are rendered
    expect(screen.getByText('AAPL', { selector: 'td' })).toBeInTheDocument()
    expect(screen.getByText('GOOGL', { selector: 'td' })).toBeInTheDocument()
  })

  test('filters trades by asset', async () => {
    render(
      <BrowserRouter>
        <TradeHistory />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('AAPL', { selector: 'td' })).toBeInTheDocument()
    })

    // Select AAPL from asset filter
    const assetFilter = screen.getByRole('combobox', { name: /asset/i })
    fireEvent.change(assetFilter, { target: { value: 'AAPL' } })

    // Check if only AAPL trade is visible
    expect(screen.getByText('AAPL', { selector: 'td' })).toBeInTheDocument()
    expect(screen.queryByText('GOOGL', { selector: 'td' })).not.toBeInTheDocument()
  })

  test('filters trades by status', async () => {
    render(
      <BrowserRouter>
        <TradeHistory />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('open', { selector: 'span' })).toBeInTheDocument()
    })

    // Select open trades from status filter
    const statusFilter = screen.getByRole('combobox', { name: /status/i })
    fireEvent.change(statusFilter, { target: { value: 'open' } })

    // Check if only open trades are visible
    expect(screen.queryByText('closed', { selector: 'span' })).not.toBeInTheDocument()
    expect(screen.getByText('open', { selector: 'span' })).toBeInTheDocument()
  })

  test('deletes a trade', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true)
    
    ;(db.deleteTrade as jest.Mock).mockResolvedValue(undefined)

    render(
      <BrowserRouter>
        <TradeHistory />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('AAPL', { selector: 'td' })).toBeInTheDocument()
    })

    // Click delete button for AAPL trade
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    // Check if delete function was called
    expect(db.deleteTrade).toHaveBeenCalledWith('1')

    // Check if trade was removed from the list
    await waitFor(() => {
      expect(screen.queryByText('AAPL', { selector: 'td' })).not.toBeInTheDocument()
    })
  })

  test('calculates and displays profit/loss correctly', async () => {
    render(
      <BrowserRouter>
        <TradeHistory />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('AAPL', { selector: 'td' })).toBeInTheDocument()
    })

    // AAPL trade: (160 - 150) * 10 = $100 profit
    expect(screen.getByText('$100.00')).toBeInTheDocument()

    // Profit percentage: ((160 - 150) / 150) * 100 = 6.67%
    expect(screen.getByText('6.67%')).toBeInTheDocument()
  })
}) 