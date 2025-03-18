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
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Calculate total exited quantity
  const calculateTotalExitedQuantity = () => {
    if (!trade.exits?.length) return 0;
    return trade.exits.reduce((total, exit) => total + exit.quantity, 0);
  };

  // Calculate total P/L
  const calculateTotalPnL = () => {
    if (!trade.exits?.length) return 0;
    return trade.exits.reduce((total, exit) => total + calculatePnL(exit), 0);
  };

  // Calculate average exit price
  const calculateAvgExitPrice = () => {
    if (!trade.exits?.length) return 0;
    const totalQuantity = calculateTotalExitedQuantity();
    const weightedSum = trade.exits.reduce((sum, exit) => sum + (exit.exit_price * exit.quantity), 0);
    return totalQuantity > 0 ? weightedSum / totalQuantity : 0;
  };

  // Check if there's remaining quantity to exit
  const hasRemainingQuantity = () => {
    const totalExited = calculateTotalExitedQuantity();
    return totalExited < trade.quantity;
  };

  const handleAddExit = async (exitData: Partial<TradeExit>) => {
    try {
      setError(null);
      const totalExited = calculateTotalExitedQuantity();
      const remainingQty = trade.quantity - totalExited;
      
      if (remainingQty <= 0) {
        throw new Error('No remaining quantity to exit');
      }

      if (!exitData.exit_price || exitData.exit_price <= 0) {
        throw new Error('Please enter a valid exit price');
      }

      if (!exitData.quantity || exitData.quantity <= 0) {
        throw new Error('Please enter a valid quantity');
      }

      if (exitData.quantity > remainingQty) {
        throw new Error(`Exit quantity cannot exceed remaining position size (${remainingQty})`);
      }

      if (!exitData.exit_trigger) {
        throw new Error('Please select an exit trigger');
      }

      const newExit = {
        trade_id: trade.id,
        user_id: trade.user_id,
        exit_date: exitData.exit_date || new Date().toISOString().split('T')[0],
        exit_price: Number(exitData.exit_price),
        quantity: Number(exitData.quantity),
        exit_trigger: exitData.exit_trigger,
        fees: 0,
        notes: ''
      };

      console.log('Adding new exit:', newExit);
      await db.addTradeExit(newExit);

      setIsAddingExit(false);
      onExitAdded();
    } catch (err) {
      console.error('Error adding exit:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to add exit. Please check all fields are filled correctly.');
      }
    }
  };

  const handleEditExit = async (exitData: Partial<TradeExit>) => {
    try {
      setError(null);
      if (!editingExit) return;

      const otherExitsQuantity = trade.exits
        .filter(exit => exit.id !== editingExit.id)
        .reduce((sum, exit) => sum + exit.quantity, 0);
      const availableQuantity = trade.quantity - otherExitsQuantity;

      if (exitData.quantity! > availableQuantity) {
        throw new Error(`Exit quantity cannot exceed available position size (${availableQuantity})`);
      }

      await db.updateTradeExit({
        ...editingExit,
        ...exitData
      });
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
      await db.deleteTradeExit(exitId);
      await new Promise(resolve => setTimeout(resolve, 100));
      onExitAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete exit');
    } finally {
      setIsDeleting(null);
    }
  };

  const calculatePnL = (exit: TradeExit) => {
    const multiplier = trade.type === 'long' ? 1 : -1;
    return multiplier * (exit.exit_price - trade.entry_price!) * exit.quantity;
  };

  const ExitForm = ({ 
    initialData,
    onSubmit,
    onCancel 
  }: { 
    initialData?: Partial<TradeExit>, 
    onSubmit: (data: Partial<TradeExit>) => Promise<void>,
    onCancel: () => void 
  }) => {
    const [formData, setFormData] = useState({
      exit_date: initialData?.exit_date || new Date().toISOString().split('T')[0],
      exit_price: initialData?.exit_price?.toString() || '',
      quantity: initialData?.quantity?.toString() || '',
      exit_trigger: initialData?.exit_trigger || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const submitData: Partial<TradeExit> = {
        exit_date: formData.exit_date,
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : undefined,
        quantity: formData.quantity ? parseInt(formData.quantity, 10) : undefined,
        exit_trigger: formData.exit_trigger || undefined
      };
      
      onSubmit(submitData);
    };

    return (
      <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900">{initialData ? 'Update Exit' : 'Add New Exit'}</h2>
          <div className="ml-auto text-sm text-indigo-600">
            Remaining: {trade.quantity - calculateTotalExitedQuantity()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="exit_date" className="block text-[15px] text-gray-700">
              Exit Date
            </label>
            <input
              type="date"
              id="exit_date"
              value={formData.exit_date}
              onChange={(e) => setFormData(prev => ({ ...prev, exit_date: e.target.value }))}
              className="mt-1 block w-full rounded-lg bg-white/50 border-gray-200"
              required
            />
          </div>

          <div>
            <label htmlFor="exit_price" className="block text-[15px] text-gray-700">
              Exit Price
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                id="exit_price"
                value={formData.exit_price}
                onChange={(e) => setFormData(prev => ({ ...prev, exit_price: e.target.value }))}
                className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-[15px] text-gray-700">
              Quantity
            </label>
            <div className="mt-1 relative">
              <input
                type="number"
                min="1"
                max={trade.quantity - calculateTotalExitedQuantity()}
                id="quantity"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className="block w-full rounded-lg bg-white/50 border-gray-200"
                required
                placeholder="0"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <span className="text-sm text-gray-500">
                  Max: {trade.quantity - calculateTotalExitedQuantity()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="exit_trigger" className="block text-[15px] text-gray-700">
              Exit Trigger
            </label>
            <select
              id="exit_trigger"
              value={formData.exit_trigger}
              onChange={(e) => setFormData(prev => ({ ...prev, exit_trigger: e.target.value }))}
              className="mt-1 block w-full rounded-lg bg-white/50 border-gray-200"
              required
            >
              <option value="">Select Exit Trigger</option>
              <option value="Breakeven exit">Breakeven exit</option>
              <option value="Market Pressure">Market Pressure</option>
              <option value="R multiples">R multiples</option>
              <option value="Random">Random</option>
              <option value="Rejection">Rejection</option>
              <option value="Setup Failed">Setup Failed</option>
              <option value="SL">Stop Loss</option>
              <option value="Target">Target</option>
              <option value="Trailing SL">Trailing Stop Loss</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-end space-x-4 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm hover:shadow transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-sm hover:shadow transition-all duration-200"
            >
              {initialData ? 'Update Exit' : 'Add Exit'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Stats Component
  const StatsBar = () => {
    const totalExits = trade.exits?.length || 0;
    const totalPnL = calculateTotalPnL();
    const avgExitPrice = calculateAvgExitPrice();
    const remaining = trade.quantity - calculateTotalExitedQuantity();

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/70 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20">
          <h3 className="text-sm font-medium text-gray-500">Total Exits</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{totalExits}</p>
        </div>
        
        <div className="bg-white/70 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20">
          <h3 className="text-sm font-medium text-gray-500">Total P/L</h3>
          <p className={`mt-1 text-2xl font-semibold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalPnL.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white/70 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20">
          <h3 className="text-sm font-medium text-gray-500">Avg. Exit Price</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            ${avgExitPrice.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white/70 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20">
          <h3 className="text-sm font-medium text-gray-500">Remaining</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{remaining}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <StatsBar />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <svg className="w-7 h-7 mr-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Trade Exits
          </h2>
          {hasRemainingQuantity() && (
            <div className="mt-2 flex items-center">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                  style={{ width: `${(calculateTotalExitedQuantity() / trade.quantity) * 100}%` }}
                ></div>
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {calculateTotalExitedQuantity()}/{trade.quantity} ({((calculateTotalExitedQuantity() / trade.quantity) * 100).toFixed(0)}%)
              </span>
            </div>
          )}
        </div>
        
        {!isAddingExit && !editingExit && trade.status === 'open' && hasRemainingQuantity() && (
          <button
            type="button"
            onClick={() => setIsAddingExit(true)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Exit
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start">
          <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Exit Form */}
      {isAddingExit && (
        <ExitForm 
          onSubmit={handleAddExit}
          onCancel={() => setIsAddingExit(false)}
        />
      )}

      {editingExit && (
        <ExitForm 
          initialData={editingExit}
          onSubmit={handleEditExit}
          onCancel={() => setEditingExit(null)}
        />
      )}

      {/* Exits Table */}
      {trade.exits && trade.exits.length > 0 ? (
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">P/L</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trade.exits.map((exit, index) => (
                  <tr 
                    key={exit.id} 
                    className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(exit.exit_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${exit.exit_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exit.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`px-2.5 py-1 rounded-full ${calculatePnL(exit) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        ${calculatePnL(exit).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setEditingExit(exit)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                          disabled={!!editingExit || isAddingExit}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this exit?')) {
                              handleDeleteExit(exit.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900 flex items-center"
                          disabled={isDeleting === exit.id || !!editingExit || isAddingExit}
                        >
                          {isDeleting === exit.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-4 text-gray-500 text-sm">No exits recorded yet.</p>
          {trade.status === 'open' && hasRemainingQuantity() && (
            <button
              onClick={() => setIsAddingExit(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add your first exit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
