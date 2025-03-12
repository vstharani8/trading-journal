import React, { useState } from 'react';
import { InvestmentFormData } from '../../../types/investment';

interface InvestmentFormProps {
    onSubmit: (data: InvestmentFormData) => Promise<void>;
}

export const InvestmentForm: React.FC<InvestmentFormProps> = ({ onSubmit }) => {
    const [formData, setFormData] = useState<InvestmentFormData>({
        stockSymbol: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: 0,
        numberOfShares: 0,
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
        setFormData({
            stockSymbol: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            purchasePrice: 0,
            numberOfShares: 0,
            notes: ''
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
            <div>
                <label htmlFor="stockSymbol" className="block text-sm font-medium text-gray-700">
                    Stock Symbol
                </label>
                <input
                    type="text"
                    id="stockSymbol"
                    value={formData.stockSymbol}
                    onChange={(e) => setFormData({ ...formData, stockSymbol: e.target.value.toUpperCase() })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                />
            </div>

            <div>
                <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">
                    Purchase Date
                </label>
                <input
                    type="date"
                    id="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                />
            </div>

            <div>
                <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">
                    Purchase Price
                </label>
                <input
                    type="number"
                    id="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    step="0.01"
                    min="0"
                    required
                />
            </div>

            <div>
                <label htmlFor="numberOfShares" className="block text-sm font-medium text-gray-700">
                    Number of Shares
                </label>
                <input
                    type="number"
                    id="numberOfShares"
                    value={formData.numberOfShares}
                    onChange={(e) => setFormData({ ...formData, numberOfShares: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    min="1"
                    required
                />
            </div>

            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                </label>
                <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    rows={3}
                />
            </div>

            <button
                type="submit"
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                Add Investment
            </button>
        </form>
    );
}; 