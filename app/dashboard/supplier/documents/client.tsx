'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DocumentUploader } from '@/components/features/documents/DocumentUploader';
import { Package, Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { OrderStatus } from '@/lib/supabase/database.types';

interface Order {
    id: string;
    product_name: string;
    status: OrderStatus;
    created_at: string;
    po_number: string | null;
}

interface SupplierDocumentsClientProps {
    orders: Order[];
}

export default function SupplierDocumentsClient({ orders }: SupplierDocumentsClientProps) {
    const [selectedOrderId, setSelectedOrderId] = useState<string>(
        orders.length > 0 ? orders[0].id : ''
    );

    // No orders state
    if (orders.length === 0) {
        return (
            <Card>
                <CardContent className="pt-12 pb-12">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Orders Yet
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            You need to create an order before uploading documents. Documents are
                            associated with specific orders for tracking and validation.
                        </p>
                        <Link href="/dashboard/supplier/orders/new">
                            <Button className="bg-purple-600 hover:bg-purple-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Order
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Order Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Order</CardTitle>
                    <CardDescription>
                        Choose which order this document belongs to
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="order-select">Order</Label>
                        <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                            <SelectTrigger id="order-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {orders.map((order) => (
                                    <SelectItem key={order.id} value={order.id}>
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-medium">{order.product_name}</span>
                                            <span className="text-sm text-gray-500 ml-4">
                                                {order.po_number || `Order ${order.id.slice(0, 8)}`} •{' '}
                                                {order.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {orders.length > 1 && (
                            <p className="text-sm text-gray-500 flex items-start gap-2 mt-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>
                                    You have {orders.length} orders. Make sure to select the correct
                                    order before uploading documents.
                                </span>
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Document Uploader */}
            {selectedOrderId && <DocumentUploader orderId={selectedOrderId} />}
        </div>
    );
}
