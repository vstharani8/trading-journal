import React from 'react';
import { InvestmentFormData } from '../../types/investment';
import { InvestmentForm } from './InvestmentForm';

interface InvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: InvestmentFormData) => Promise<void>;
    initialData?: InvestmentFormData;
    mode: 'add' | 'edit';
}

export const InvestmentModal: React.FC<InvestmentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    mode
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 shadow-xl transition-all w-full max-w-lg">
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-gray-900">
                            {mode === 'add' ? 'Add New Investment' : 'Edit Investment'}
                        </h3>
                        <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500"
                            onClick={onClose}
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Form */}
                    <InvestmentForm
                        onSubmit={async (data) => {
                            await onSubmit(data);
                            onClose();
                        }}
                        initialData={initialData}
                    />

                    {/* Cancel button for edit mode */}
                    {mode === 'edit' && (
                        <div className="mt-4">
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                                onClick={onClose}
                            >
                                Cancel Edit
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 