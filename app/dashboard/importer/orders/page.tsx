import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Package, Eye, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function AllOrdersPage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch user profile to verify role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'importer') {
        redirect('/login');
    }

    // Fetch ALL orders for this importer with supplier info
    const { data: orders } = await supabase
        .from('orders')
        .select(`
      *,
      supplier:profiles!orders_supplier_id_fkey(full_name, company_name, email)
    `)
        .eq('importer_id', user.id)
        .order('created_at', { ascending: false });

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            draft: 'bg-gray-100 text-gray-700',
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

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <Link href="/dashboard/importer">
                            <Button variant="ghost" size="sm" className="text-gray-600">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">All Orders</h1>
                    <p className="text-gray-600 mt-1">
                        Complete list of your import orders
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <Package className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{orders?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                        <Package className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {orders?.filter((o) => !['completed', 'cancelled'].includes(o.status)).length || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                        <Package className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${orders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0).toLocaleString() || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Orders List</CardTitle>
                    <CardDescription>
                        All import orders from your suppliers
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!orders || orders.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium mb-2">No orders yet</p>
                            <p className="text-sm">Orders will appear here once suppliers create them</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Total Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono text-sm">
                                                {order.po_number || order.id.slice(0, 8)}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {order.supplier.full_name}
                                                    </p>
                                                    {order.supplier.company_name && (
                                                        <p className="text-xs text-gray-500">
                                                            {order.supplier.company_name}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {order.product_name}
                                                    </p>
                                                    {order.variety && (
                                                        <p className="text-xs text-gray-500">
                                                            {order.variety}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Package className="w-4 h-4 mr-1 text-gray-400" />
                                                    <span>
                                                        {order.total_quantity?.toLocaleString() || 0}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                ${order.total_amount?.toLocaleString() || '0'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(order.status)}>
                                                    {order.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/dashboard/importer/orders/${order.id}`}>
                                                    <Button size="sm" variant="outline">
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        View
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
