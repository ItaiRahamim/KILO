'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
    Package,
    DollarSign,
    Ship,
    CheckCircle2,
    ArrowLeft,
    FileText,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface OrderDetailsClientProps {
    order: any;
    profile: any;
}

export default function OrderDetailsClient({ order, profile }: OrderDetailsClientProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isApproving, setIsApproving] = useState(false);
    const [showApprovalDialog, setShowApprovalDialog] = useState(false);

    const handleApproveOrder = async () => {
        setIsApproving(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'quote_approved' })
                .eq('id', order.id);

            if (error) throw error;

            toast.success('Order approved successfully!');
            setShowApprovalDialog(false);
            router.refresh();
        } catch (error: any) {
            console.error('Error approving order:', error);
            toast.error(error?.message || 'Failed to approve order');
        } finally {
            setIsApproving(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            draft: 'bg-amber-100 text-amber-700',
            quote_pending: 'bg-amber-100 text-amber-700',
            quote_approved: 'bg-green-100 text-green-700',
            order_confirmed: 'bg-blue-100 text-blue-700',
            proforma_pending: 'bg-amber-100 text-amber-700',
            proforma_approved: 'bg-green-100 text-green-700',
            payment_pending: 'bg-amber-100 text-amber-700',
            shipped: 'bg-blue-100 text-blue-700',
            customs_clearance: 'bg-purple-100 text-purple-700',
            released: 'bg-green-100 text-green-700',
            completed: 'bg-green-100 text-green-700',
            cancelled: 'bg-red-100 text-red-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const sizesJson = order.sizes_json as any;
    const paymentTermsJson = order.payment_terms_json as any;

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <Link href="/dashboard/importer/orders">
                            <Button variant="ghost" size="sm" className="text-gray-600">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back to Orders
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-3">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Order {order.po_number || order.id.slice(0, 8)}
                        </h1>
                        <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                        </Badge>
                    </div>
                    <p className="text-gray-600 mt-1">
                        Created on {new Date(order.created_at).toLocaleDateString()}
                    </p>
                </div>

                {/* Approve Button for Draft Orders */}
                {order.status === 'draft' && (
                    <Button
                        size="lg"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setShowApprovalDialog(true)}
                    >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Approve Order
                    </Button>
                )}
            </div>

            {/* Draft Warning */}
            {order.status === 'draft' && (
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-6">
                        <div className="flex items-start space-x-3">
                            <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-amber-900">
                                    This order is awaiting your approval
                                </p>
                                <p className="text-sm text-amber-700 mt-1">
                                    Review the order details below and click "Approve Order" to allow the supplier to proceed with document uploads.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Supplier Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Supplier Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{order.supplier.full_name}</span>
                    </div>
                    {order.supplier.company_name && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Company:</span>
                            <span className="font-medium">{order.supplier.company_name}</span>
                        </div>
                    )}
                    {order.supplier.email && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium">{order.supplier.email}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Product Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Package className="w-5 h-5 mr-2" />
                        Product Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Product Name</p>
                            <p className="font-medium">{order.product_name}</p>
                        </div>
                        {order.variety && (
                            <div>
                                <p className="text-sm text-gray-600">Variety</p>
                                <p className="font-medium">{order.variety}</p>
                            </div>
                        )}
                        {order.packaging && (
                            <div>
                                <p className="text-sm text-gray-600">Packaging</p>
                                <p className="font-medium">{order.packaging}</p>
                            </div>
                        )}
                        {order.kg_per_box && (
                            <div>
                                <p className="text-sm text-gray-600">Kg per Box</p>
                                <p className="font-medium">{order.kg_per_box}</p>
                            </div>
                        )}
                        {order.hs_code && (
                            <div>
                                <p className="text-sm text-gray-600">HS Code</p>
                                <p className="font-medium font-mono">{order.hs_code}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Size Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>Size Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    {sizesJson?.type === 'uniform' ? (
                        <div className="space-y-2">
                            <Badge variant="outline">Uniform Size</Badge>
                            <div className="grid grid-cols-3 gap-4 mt-3">
                                <div>
                                    <p className="text-sm text-gray-600">Size</p>
                                    <p className="font-medium">{sizesJson.size}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Quantity</p>
                                    <p className="font-medium">{sizesJson.quantity?.toLocaleString()} boxes</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Price per Box</p>
                                    <p className="font-medium">${sizesJson.price_per_unit?.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Badge variant="outline">Mixed Sizes</Badge>
                            {sizesJson?.items?.map((item: any, index: number) => (
                                <div key={index} className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm text-gray-600">Size</p>
                                        <p className="font-medium">{item.size}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Quantity</p>
                                        <p className="font-medium">{item.quantity?.toLocaleString()} boxes</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Price per Box</p>
                                        <p className="font-medium">${item.price_per_unit?.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <DollarSign className="w-5 h-5 mr-2" />
                        Payment Terms
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {paymentTermsJson?.map((term: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium capitalize">{term.stage}</p>
                                    <p className="text-sm text-gray-600">{term.percent}%</p>
                                </div>
                                <p className="font-medium text-lg">${term.amount?.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                            <p className="text-lg font-semibold">Total Amount</p>
                            <p className="text-2xl font-bold text-purple-600">
                                ${order.total_amount?.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Shipping Info */}
            {(order.port_of_loading || order.port_of_discharge) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Ship className="w-5 h-5 mr-2" />
                            Shipping Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {order.port_of_loading && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Port of Loading:</span>
                                <span className="font-medium">{order.port_of_loading}</span>
                            </div>
                        )}
                        {order.port_of_discharge && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Port of Discharge:</span>
                                <span className="font-medium">{order.port_of_discharge}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Approval Dialog */}
            <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
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
                            onClick={handleApproveOrder}
                            disabled={isApproving}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isApproving ? 'Approving...' : 'Yes, Approve Order'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
