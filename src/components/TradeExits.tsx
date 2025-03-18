import { useState, useEffect, useRef } from 'react';
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
    fees: undefined,
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
      await db.addTradeExit(exitData);

      // Reset form
      setNewExit({
        exit_date: new Date().toISOString().split('T')[0],
        exit_price: 0,
        quantity: 0,
        fees: undefined,
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

      if (editingExit.quantity > availableQuantity) {
        throw new Error(`Exit quantity cannot exceed available position size (${availableQuantity})`);
      }

      // Update the exit
      await db.updateTradeExit(editingExit);
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
      
      // Get the exit being deleted to calculate remaining quantity
      const exitBeingDeleted = trade.exits.find(exit => exit.id === exitId);
      if (!exitBeingDeleted) {
        throw new Error('Exit not found');
      }
      
      // Delete the exit
      await db.deleteTradeExit(exitId);
      
      // Wait a brief moment for the database trigger to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Notify parent component to refresh the data
      onExitAdded();
    } catch (err) {
      console.error('Error deleting exit:', err);
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
  }) => {
    // Initialize form state with a single object to avoid synchronization issues
    const [formState, setFormState] = useState({
      exitPrice: '',
      fees: '',
      quantity: ''
    });
    
    // Reset form when exit changes
    useEffect(() => {
      setFormState({
        exitPrice: exit.exit_price && exit.exit_price !== 0 ? exit.exit_price.toString() : '',
        fees: exit.fees && exit.fees !== 0 ? exit.fees.toString() : '',
        quantity: exit.quantity && exit.quantity !== 0 ? exit.quantity.toString() : ''
      });
    }, [exit]);

    const inputRef = useRef<HTMLInputElement>(null);
    const handleInputChange = (field: 'exitPrice' | 'fees' | 'quantity', value: string) => {
      if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    
      setFormState(prev => ({
        ...prev,
        [field]: value
      }));
    
      // Maintain cursor position
      if (inputRef.current) {
        const cursorPosition = inputRef.current.selectionStart || 0;
        setTimeout(() => inputRef.current?.setSelectionRange(cursorPosition, cursorPosition), 0);
      }
    };
    // Generic handler for all numeric inputs
    // const handleInputChange = (field: 'exitPrice' | 'fees' | 'quantity', value: string) => {
    //   // First update the form state
    //   setFormState(prev => ({
    //     ...prev,
    //     [field]: value
    //   }));
      
    //   // Then update the parent state if value is valid
    //   if (value === '' || !isNaN(Number(value))) {
    //     const numValue = value === '' ? 0 : 
    //       field === 'quantity' ? parseInt(value, 10) : parseFloat(value);
        
    //     // Map the field name to the property name in the parent state
    //     const propName = field === 'exitPrice' ? 'exit_price' : field;
        
    //     if (exit === editingExit) {
    //       setEditingExit(prev => ({
    //         ...prev!,
    //         [propName]: numValue
    //       }));
    //     } else {
    //       setNewExit(prev => ({
    //         ...prev,
    //         [propName]: numValue
    //       }));
    //     }
    //   }
    // };

    return (
      <form onSubmit={onSubmit} className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {exit === editingExit ? 'Update Exit' : 'Add New Exit'}
          </h2>
          <div className="text-sm text-indigo-600 font-medium">
            {exit === editingExit ? 'Editing Exit' : `Remaining: ${trade.quantity - calculateTotalExitedQuantity()}`}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* First Row */}
          <div className="group">
            <label htmlFor="exit_date" className="block text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors duration-200">
              Exit Date
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                id="exit_date"
                value={exit.exit_date}
                onChange={(e) => exit === editingExit 
                  ? setEditingExit({ ...editingExit, exit_date: e.target.value })
                  : setNewExit({ ...newExit, exit_date: e.target.value })
                }
                className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="group">
            <label htmlFor="exit_price" className="block text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors duration-200">
              Exit Price
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm group-hover:text-indigo-500 transition-colors duration-200">$</span>
              </div>
              <input
                ref={inputRef}
                type="text"
                id="exit_price"
                value={formState.exitPrice}
                onChange={(e) => handleInputChange('exitPrice', e.target.value)}
                className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200 hover:border-indigo-400"
                required
                placeholder="000.00"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Second Row */}
          <div className="group">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors duration-200">
              Quantity
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <input
                type="text"
                id="quantity"
                value={formState.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200 hover:border-indigo-400"
                required
                placeholder="0"
                inputMode="numeric"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-xs text-gray-500">Max: {trade.quantity - calculateTotalExitedQuantity()}</span>
              </div>
            </div>
          </div>

          <div className="group">
            <label htmlFor="fees" className="block text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors duration-200">
              Fees
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm group-hover:text-indigo-500 transition-colors duration-200">$</span>
              </div>
              <input
                type="text"
                id="fees"
                value={formState.fees}
                onChange={(e) => handleInputChange('fees', e.target.value)}
                className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200 hover:border-indigo-400"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Third Row */}
          <div className="group sm:col-span-2">
            <label htmlFor="exit_trigger" className="block text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors duration-200">
              Exit Trigger
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <select
                id="exit_trigger"
                value={exit.exit_trigger || ''}
                onChange={(e) => exit === editingExit
                  ? setEditingExit({ ...editingExit, exit_trigger: e.target.value })
                  : setNewExit({ ...newExit, exit_trigger: e.target.value })
                }
                className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200 [&>*]:truncate-none [&>*]:whitespace-normal"
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
          </div>

          {/* Fourth Row */}
          <div className="group sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors duration-200">
              Notes
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <textarea
                id="notes"
                value={exit.notes}
                onChange={(e) => exit === editingExit
                  ? setEditingExit({ ...editingExit, notes: e.target.value })
                  : setNewExit({ ...newExit, notes: e.target.value })
                }
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                rows={3}
                placeholder="Add any notes about this exit..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-lg transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
          >
            {exit === editingExit ? (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Update Exit
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Exit
              </span>
            )}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
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
            onClick={() => {
              setIsAddingExit(true);
            }}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Exit
          </button>
        )}
      </div>
      
      {/* Summary Cards */}
      {trade.exits && trade.exits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-white/20"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Exits</h3>
            <p className="text-2xl font-bold text-gray-900">{trade.exits.length}</p>
          </div>    
          <div
            className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-white/20"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total P/L</h3>
            <p className={`text-2xl font-bold ${calculateTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${calculateTotalPnL().toFixed(2)}
            </p>
          </div>    
          <div
            className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-white/20"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-1">Avg. Exit Price</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${trade.exits.reduce((sum, exit) => sum + exit.exit_price, 0) / trade.exits.length || 0}
            </p>
          </div>    
          <div
            className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-white/20"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-1">Remaining</h3>
            <p className="text-2xl font-bold text-gray-900">{trade.quantity - calculateTotalExitedQuantity()}</p>
          </div>  </div>
      )}

      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start"
        >
          <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isAddingExit && (
        <div>
          <ExitForm 
            exit={{
              ...newExit,
              quantity: Math.min(newExit.quantity || 0, trade.quantity - calculateTotalExitedQuantity())
            }} 
            onSubmit={handleAddExit}
            onCancel={() => setIsAddingExit(false)}
          />
        </div>
      )}

      {editingExit && (
        <div>
          <ExitForm 
            exit={editingExit} 
            onSubmit={handleEditExit}
            onCancel={() => setEditingExit(null)}
          />
        </div>
      )}

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
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fees</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trigger</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${exit.fees?.toFixed(2) ?? '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exit.exit_trigger ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {exit.exit_trigger}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {exit.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => {
                            setEditingExit(exit);
                          }}
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
              <tfoot>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-200">
                  <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    Total P/L
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                    calculateTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span className={`px-3 py-1 rounded-full ${calculateTotalPnL() >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      ${calculateTotalPnL().toFixed(2)}
                    </span>
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
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
