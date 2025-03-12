import React from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { investmentService } from '@/services/investment';

const formSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  purchase_price: z.coerce.number().positive('Must be a positive number'),
  shares: z.coerce.number().positive('Must be a positive number'),
  commission: z.coerce.number().min(0, 'Must be a non-negative number').default(0),
  notes: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface AddInvestmentDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
}

export default function AddInvestmentDialog({ open, onClose, onAdd }: AddInvestmentDialogProps) {
  const user = useUser();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbol: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 0,
      shares: 0,
      commission: 0,
      notes: ''
    }
  });

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    try {
      await investmentService.addInvestment({
        user_id: user.id,
        symbol: data.symbol.toUpperCase(),
        purchase_date: data.purchase_date,
        purchase_price: data.purchase_price,
        shares: data.shares,
        commission: data.commission,
        notes: data.notes || null
      });

      form.reset();
      onAdd();
    } catch (error) {
      console.error('Error adding investment:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Investment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Symbol</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="AAPL" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchase_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchase_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Price</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shares"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Shares</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission/Fees (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Investment</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 