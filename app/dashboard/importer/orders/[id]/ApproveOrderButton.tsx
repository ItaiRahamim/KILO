'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApproveOrderButtonProps {
    orderId: string;
}

export default function ApproveOrderButton({ orderId }: ApproveOrderButtonProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isApproving, setIsApproving] = useState(false);
    const [showDialog, setShowDialog] = useState(false);

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'quote_approved' })
                .eq('id', orderId);

            if (error) throw error;

            toast.success('Order approved successfully!');
            setShowDialog(false);
            router.refresh();
        } catch (error: any) {
            console.error('Error approving order:', error);
            toast.error(error?.message || 'Failed to approve order');
        } finally {
            setIsApproving(false);
        }
    };

    return (
        <>
            <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowDialog(true)}
            >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Approve Order
            </Button>

            <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve this order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will change the order status to "Quote Approved" and allow the supplier to upload documents.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleApprove}
                            disabled={isApproving}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isApproving ? 'Approving...' : 'Yes, Approve Order'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
