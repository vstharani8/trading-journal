import { useState } from 'react';
import { Trade, TradeExit } from '../../types/trade';
import { db } from '../services/supabase';

interface TradeExitsProps {
  trade: Trade;
  onExitAdded: () => void;
}

export default function TradeExits({ trade, onExitAdded }: TradeExitsProps) {
  const [isAddingExit, setIsAddingExit] = useState(false);
  const [editingExit, setEditingExit] = useState<TradeExit | null>(null);
  const [newExit, setNewExit] = useState<Partial<TradeExit>>({
    exit_date: new Date().toISOString().split('T')[0],
    exit_price: 0,
    quantity: 0,
    fees: 0,
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Calculate total exited quantity
  const calculateTotalExitedQuantity = () => {
    if (!trade.exits?.length) return 0;
    return trade.exits.reduce((total, exit) => total + exit.quantity, 0);
  };

  // Check if there's remaining quantity to exit
  const hasRemainingQuantity = () => {
    const totalExited = calculateTotalExitedQuantity();
    return totalExited < trade.quantity;
  };

  const handleAddExit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate exit quantity
      const totalExited = calculateTotalExitedQuantity();
      const remainingQty = trade.quantity - totalExited;
      
      if (remainingQty <= 0) {
        throw new Error('No remaining quantity to exit');
      }

      if (!newExit.quantity || newExit.quantity <= 0) {
        throw new Error('Exit quantity must be greater than 0');
      }

      if (!newExit.exit_price || newExit.exit_price <= 0) {
        throw new Error('Exit price must be greater than 0');
      }

      if (newExit.quantity! > remainingQty) {
        throw new Error(`Exit quantity cannot exceed remaining position size (${remainingQty})`);
      }

      // Create the exit with all required fields
      const exitData = {
        trade_id: trade.id,
        user_id: trade.user_id,
        exit_date: newExit.exit_date || new Date().toISOString().split('T')[0],
        exit_price: newExit.exit_price || 0,
        quantity: newExit.quantity || 0,
        fees: newExit.fees || 0,
        notes: newExit.notes || ''
      };

      // Create the exit
      try {
        await db.addTradeExit(exitData);
      } catch (error) {
        throw new Error('Failed to add exit');
      }

      // Calculate new total exited quantity
      const newTotalExited = totalExited + (newExit.quantity || 0);
      
      // Prepare trade update without exits array
      const tradeUpdate = {
        ...trade,
        status: newTotalExited >= trade.quantity ? 'closed' as const : 'open' as const,
        exit_date: newTotalExited >= trade.quantity ? newExit.exit_date || null : null,
        exit_price: newTotalExited >= trade.quantity ? newExit.exit_price : null,
        remaining_quantity: trade.quantity - newTotalExited,
        updated_at: new Date().toISOString()
      };

      // Update trade status
      await db.updateTrade(tradeUpdate);

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

  const handleEditExit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!editingExit) return;

      // Validate exit quantity
      const otherExitsQuantity = trade.exits
        .filter(exit => exit.id !== editingExit.id)
        .reduce((sum, exit) => sum + exit.quantity, 0);
      const availableQuantity = trade.quantity - otherExitsQuantity;

      if (!editingExit.quantity || editingExit.quantity <= 0) {
        throw new Error('Exit quantity must be greater than 0');
      }

      if (!editingExit.exit_price || editingExit.exit_price <= 0) {
        throw new Error('Exit price must be greater than 0');
      }

      if (editingExit.quantity > availableQuantity) {
        throw new Error(`Exit quantity cannot exceed available position size (${availableQuantity})`);
      }

      // Update the exit
      try {
        await db.updateTradeExit(editingExit);
      } catch (error) {
        throw new Error('Failed to update exit');
      }

      // Calculate new total after edit
      const newTotalExited = otherExitsQuantity + editingExit.quantity;

      // Prepare trade update without exits array
      const tradeUpdate = {
        ...trade,
        status: newTotalExited >= trade.quantity ? 'closed' as const : 'open' as const,
        exit_date: newTotalExited >= trade.quantity ? editingExit.exit_date : null,
        exit_price: newTotalExited >= trade.quantity ? editingExit.exit_price : null,
        remaining_quantity: trade.quantity - newTotalExited,
        updated_at: new Date().toISOString()
      };

      // Update trade status
      await db.updateTrade(tradeUpdate);

      setEditingExit(null);
      onExitAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update exit');
    }
  };

  const handleDeleteExit = async (exitId: string) => {
    try {
      setIsDeleting(exitId);
      setError(null);
      
      // Get the exit being deleted
      const exitToDelete = trade.exits.find(exit => exit.id === exitId);
      if (!exitToDelete) {
        throw new Error('Exit not found');
      }

      // Delete the exit
      try {
        await db.deleteTradeExit(exitId);
      } catch (error) {
        throw new Error('Failed to delete exit');
      }

      // Calculate new total exited quantity
      const remainingExits = trade.exits.filter(exit => exit.id !== exitId);
      const newTotalExited = remainingExits.reduce((sum, exit) => sum + exit.quantity, 0);

      // Prepare trade update without exits array
      const tradeUpdate = {
        ...trade,
        status: 'open' as const,
        exit_date: null,
        exit_price: null,
        remaining_quantity: trade.quantity - newTotalExited,
        updated_at: new Date().toISOString()
      };

      // Update trade status
      await db.updateTrade(tradeUpdate);

      // Reset states and refresh
      setEditingExit(null);
      setIsAddingExit(false);
      onExitAdded();
    } catch (err) {
      console.error('Delete exit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete exit');
    } finally {
      setIsDeleting(null);
    }
  };

  const calculatePnL = (exit: TradeExit) => {
    const multiplier = trade.type === 'long' ? 1 : -1;
    return multiplier * (exit.exit_price - trade.entry_price!) * exit.quantity;
  };

  const calculateTotalPnL = () => {
    if (!trade.exits?.length) return 0;
    return trade.exits.reduce((total, exit) => total + calculatePnL(exit), 0);
  };

  const ExitForm = ({ exit, onSubmit, onCancel }: { 
    exit: Partial<TradeExit>, 
    onSubmit: (e: React.FormEvent) => Promise<void>,
    onCancel: () => void 
  }) => (
    <form onSubmit={onSubmit} className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20 space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="exit_date" className="block text-sm font-medium text-gray-700">
            Exit Date
          </label>
          <input
            type="date"
            id="exit_date"
            value={exit.exit_date}
            onChange={(e) => exit === editingExit 
              ? setEditingExit({ ...editingExit, exit_date: e.target.value })
              : setNewExit({ ...newExit, exit_date: e.target.value })
            }
            className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="exit_price" className="block text-sm font-medium text-gray-700">
            Exit Price
          </label>
          <div className="mt-2 relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="exit_price"
              value={exit.exit_price}
              onChange={(e) => exit === editingExit
                ? setEditingExit({ ...editingExit, exit_price: Number(e.target.value) })
                : setNewExit({ ...newExit, exit_price: Number(e.target.value) })
              }
              className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              step="any"
              min="0"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantity (Max: {trade.quantity - calculateTotalExitedQuantity()})
          </label>
          <input
            type="number"
            id="quantity"
            value={exit.quantity}
            onChange={(e) => exit === editingExit
              ? setEditingExit({ ...editingExit, quantity: Number(e.target.value) })
              : setNewExit({ ...newExit, quantity: Number(e.target.value) })
            }
            className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            step="any"
            min="0"
            max={trade.quantity - calculateTotalExitedQuantity()}
            required
          />
        </div>

        <div>
          <label htmlFor="fees" className="block text-sm font-medium text-gray-700">
            Fees
          </label>
          <div className="mt-2 relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="fees"
              value={exit.fees}
              onChange={(e) => exit === editingExit
                ? setEditingExit({ ...editingExit, fees: Number(e.target.value) })
                : setNewExit({ ...newExit, fees: Number(e.target.value) })
              }
              className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              step="any"
              min="0"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={exit.notes}
            onChange={(e) => exit === editingExit
              ? setEditingExit({ ...editingExit, notes: e.target.value })
              : setNewExit({ ...newExit, notes: e.target.value })
            }
            className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {exit === editingExit ? 'Update Exit' : 'Add Exit'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Trade Exits
          {hasRemainingQuantity() && (
            <span className="ml-2 text-sm text-gray-500">
              (Remaining: {trade.quantity - calculateTotalExitedQuantity()})
            </span>
          )}
        </h2>
        {!isAddingExit && !editingExit && trade.status === 'open' && hasRemainingQuantity() && (
          <button
            type="button"
            onClick={() => setIsAddingExit(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
        <ExitForm 
          exit={{
            ...newExit,
            quantity: Math.min(newExit.quantity || 0, trade.quantity - calculateTotalExitedQuantity())
          }} 
          onSubmit={handleAddExit}
          onCancel={() => setIsAddingExit(false)}
        />
      )}

      {editingExit && (
        <ExitForm 
          exit={editingExit} 
          onSubmit={handleEditExit}
          onCancel={() => setEditingExit(null)}
        />
      )}

      {trade.exits && trade.exits.length > 0 ? (
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/20">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fees</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trade.exits.map((exit) => (
                <tr key={exit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(exit.exit_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${exit.exit_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {exit.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={calculatePnL(exit) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${calculatePnL(exit).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${exit.fees?.toFixed(2) ?? '0.00'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {exit.notes || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => setEditingExit(exit)}
                      className="text-indigo-600 hover:text-indigo-900"
                      disabled={!!editingExit || isAddingExit}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this exit?')) {
                          handleDeleteExit(exit.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                      disabled={isDeleting === exit.id || !!editingExit || isAddingExit}
                    >
                      {isDeleting === exit.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Total P/L
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                  calculateTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${calculateTotalPnL().toFixed(2)}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-sm italic">No exits recorded yet.</p>
      )}
    </div>
  );
} 