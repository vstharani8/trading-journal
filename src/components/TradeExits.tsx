import { useState } from 'react';
import { Trade, TradeExit } from '../../types/trade';
import { db } from '../services/supabase';

interface TradeExitsProps {
  trade: Trade;
  onExitAdded: () => void;
}

export default function TradeExits({ trade, onExitAdded }: TradeExitsProps) {
  const [isAddingExit, setIsAddingExit] = useState(false);
  const [newExit, setNewExit] = useState<Partial<TradeExit>>({
    exit_date: new Date().toISOString().split('T')[0],
    exit_price: 0,
    quantity: 0,
    fees: 0,
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleAddExit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate exit quantity
      if (!trade.remaining_quantity && trade.remaining_quantity !== 0) {
        throw new Error('Cannot determine remaining quantity');
      }

      const remainingQty = trade.remaining_quantity ?? trade.position_size;
      if (newExit.quantity! > remainingQty) {
        throw new Error(`Exit quantity cannot exceed remaining position size (${remainingQty})`);
      }

      // Create the exit
      await db.addTradeExit({
        ...newExit,
        trade_id: trade.id,
        user_id: trade.user_id,
      } as TradeExit);

      // Reset form
      setNewExit({
        exit_date: new Date().toISOString().split('T')[0],
        exit_price: 0,
        quantity: 0,
        fees: 0,
        notes: '',
      });
      setIsAddingExit(false);
      onExitAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add exit');
    }
  };

  const calculatePnL = (exit: TradeExit) => {
    const multiplier = trade.type === 'long' ? 1 : -1;
    return multiplier * (exit.exit_price - trade.entry_price) * exit.quantity;
  };

  const calculateTotalPnL = () => {
    if (!trade.exits?.length) return 0;
    return trade.exits.reduce((total, exit) => total + calculatePnL(exit), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Trade Exits</h3>
        {!isAddingExit && trade.status === 'open' && (
          <button
            type="button"
            onClick={() => setIsAddingExit(true)}
            className="btn btn-primary btn-sm"
          >
            Add Exit
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isAddingExit && (
        <form onSubmit={handleAddExit} className="card p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exit_date" className="label">Exit Date</label>
              <input
                type="date"
                id="exit_date"
                value={newExit.exit_date}
                onChange={(e) => setNewExit({ ...newExit, exit_date: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="exit_price" className="label">Exit Price</label>
              <input
                type="number"
                id="exit_price"
                value={newExit.exit_price}
                onChange={(e) => setNewExit({ ...newExit, exit_price: Number(e.target.value) })}
                className="input"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label htmlFor="quantity" className="label">
                Quantity (Max: {trade.remaining_quantity ?? trade.position_size})
              </label>
              <input
                type="number"
                id="quantity"
                value={newExit.quantity}
                onChange={(e) => setNewExit({ ...newExit, quantity: Number(e.target.value) })}
                className="input"
                step="1"
                min="1"
                max={trade.remaining_quantity ?? trade.position_size}
                required
              />
            </div>
            <div>
              <label htmlFor="fees" className="label">Fees</label>
              <input
                type="number"
                id="fees"
                value={newExit.fees}
                onChange={(e) => setNewExit({ ...newExit, fees: Number(e.target.value) })}
                className="input"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <div>
            <label htmlFor="notes" className="label">Notes</label>
            <textarea
              id="notes"
              value={newExit.notes}
              onChange={(e) => setNewExit({ ...newExit, notes: e.target.value })}
              className="input"
              rows={2}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAddingExit(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Exit
            </button>
          </div>
        </form>
      )}

      {trade.exits && trade.exits.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Price</th>
                  <th className="th">Quantity</th>
                  <th className="th">P/L</th>
                  <th className="th">Fees</th>
                  <th className="th">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trade.exits.map((exit) => (
                  <tr key={exit.id}>
                    <td className="td">{new Date(exit.exit_date).toLocaleDateString()}</td>
                    <td className="td">${exit.exit_price.toFixed(2)}</td>
                    <td className="td">{exit.quantity}</td>
                    <td className="td">
                      <span className={calculatePnL(exit) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${calculatePnL(exit).toFixed(2)}
                      </span>
                    </td>
                    <td className="td">${exit.fees?.toFixed(2) ?? '0.00'}</td>
                    <td className="td">{exit.notes}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="td font-medium">Total P/L</td>
                  <td className={`td font-medium ${calculateTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${calculateTotalPnL().toFixed(2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No exits recorded yet.</p>
      )}
    </div>
  );
} 