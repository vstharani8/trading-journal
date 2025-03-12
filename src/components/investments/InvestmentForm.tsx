import React, { useState, useEffect } from 'react';
import { InvestmentFormData } from '../../types/investment';

interface InvestmentFormProps {
    onSubmit: (data: InvestmentFormData) => Promise<void>;
    initialData?: InvestmentFormData;
}

export const InvestmentForm: React.FC<InvestmentFormProps> = ({ onSubmit, initialData }) => {
    const [formData, setFormData] = useState<InvestmentFormData>({
        stock_symbol: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 0,
        number_of_shares: 0,
        notes: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
        setFormData({
            stock_symbol: '',
            purchase_date: new Date().toISOString().split('T')[0],
            purchase_price: 0,
            number_of_shares: 0,
            notes: ''
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
            <div>
                <label htmlFor="stock_symbol" className="block text-sm font-medium text-gray-700">
                    Stock Symbol
                </label>
                <input
                    type="text"
                    id="stock_symbol"
                    value={formData.stock_symbol}
                    onChange={(e) => setFormData({ ...formData, stock_symbol: e.target.value.toUpperCase() })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                />
            </div>

            <div>
                <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
                    Purchase Date
                </label>
                <input
                    type="date"
                    id="purchase_date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                />
            </div>

            <div>
                <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700">
                    Purchase Price
                </label>
                <input
                    type="number"
                    id="purchase_price"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    step="0.01"
                    min="0"
                    required
                />
            </div>

            <div>
                <label htmlFor="number_of_shares" className="block text-sm font-medium text-gray-700">
                    Number of Shares
                </label>
                <input
                    type="number"
                    id="number_of_shares"
                    value={formData.number_of_shares}
                    onChange={(e) => setFormData({ ...formData, number_of_shares: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    step="0.00000001"
                    min="0.00000001"
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