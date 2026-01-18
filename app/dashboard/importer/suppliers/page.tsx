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
import { Users, Mail, Building2, Package, ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';

export default async function SuppliersPage() {
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

    // Fetch all orders for this importer to get distinct suppliers
    const { data: orders } = await supabase
        .from('orders')
        .select(`
      supplier_id,
      total_amount,
      status,
      supplier:profiles!orders_supplier_id_fkey(
        id,
        full_name,
        email,
        company_name,
        phone,
        address
      )
    `)
        .eq('importer_id', user.id);

    // Group orders by supplier and calculate stats
    const supplierMap = new Map();

    orders?.forEach((order) => {
        const supplierId = order.supplier_id;
        if (!supplierMap.has(supplierId)) {
            supplierMap.set(supplierId, {
                ...order.supplier,
                totalOrders: 0,
                activeOrders: 0,
                totalValue: 0,
            });
        }

        const supplier = supplierMap.get(supplierId);
        supplier.totalOrders += 1;
        supplier.totalValue += Number(order.total_amount) || 0;

        if (!['completed', 'cancelled'].includes(order.status)) {
            supplier.activeOrders += 1;
        }
    });

    const suppliers = Array.from(supplierMap.values());

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
                    <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
                    <p className="text-gray-600 mt-1">
                        Manage your supplier relationships and performance
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{suppliers.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
                        <Users className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {suppliers.filter((s) => s.activeOrders > 0).length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <Package className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {suppliers.reduce((sum, s) => sum + s.totalOrders, 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Suppliers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Supplier List</CardTitle>
                    <CardDescription>
                        All suppliers you have worked with
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {suppliers.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium mb-2">No suppliers yet</p>
                            <p className="text-sm">Suppliers will appear here once you have orders</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Total Orders</TableHead>
                                        <TableHead>Active Orders</TableHead>
                                        <TableHead>Total Value</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {suppliers.map((supplier) => (
                                        <TableRow key={supplier.id}>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                                                        <Users className="w-5 h-5 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {supplier.full_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            ID: {supplier.id.slice(0, 8)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-sm text-gray-900">{supplier.email}</p>
                                                        {supplier.phone && (
                                                            <p className="text-xs text-gray-500">{supplier.phone}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {supplier.company_name ? (
                                                    <div className="flex items-center space-x-2">
                                                        <Building2 className="w-4 h-4 text-gray-400" />
                                                        <span className="text-sm text-gray-900">
                                                            {supplier.company_name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Package className="w-4 h-4 mr-1 text-gray-400" />
                                                    <span className="font-medium">{supplier.totalOrders}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={supplier.activeOrders > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}
                                                >
                                                    {supplier.activeOrders} active
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                ${supplier.totalValue.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    className={supplier.activeOrders > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                                                >
                                                    {supplier.activeOrders > 0 ? 'Active' : 'Inactive'}
                                                </Badge>
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
