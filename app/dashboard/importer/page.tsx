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
import {
  Package,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

export default async function ImporterDashboard() {
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

  // Fetch ALL orders for this importer (simplified for debugging)
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('importer_id', user.id)
    .order('created_at', { ascending: false });

  console.log('Orders Error:', ordersError);
  console.log('Fetched Orders:', orders);

  // Fetch pending documents
  const { data: pendingDocuments } = await supabase
    .from('documents')
    .select('id')
    .eq('approval_status', 'pending');

  // Fetch suppliers count
  const { data: suppliers } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'supplier');

  const totalOrders = orders?.length || 0;
  const activeOrders = orders?.filter((o) => !['completed', 'cancelled'].includes(o.status)).length || 0;
  const pendingApproval = orders?.filter((o) => o.status === 'draft').length || 0;
  const totalValue = orders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
  const pendingDocs = pendingDocuments?.length || 0;
  const supplierCount = suppliers?.length || 0;

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
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile.full_name}
        </h1>
        <p className="text-gray-600 mt-1">
          Here&apos;s what&apos;s happening with your imports today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-gray-600 mt-1">
              {activeOrders} active orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{pendingApproval}</div>
            <p className="text-xs text-amber-600 mt-1">Draft orders to review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 mt-1">Across all orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Documents</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDocs}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierCount}</div>
            <p className="text-xs text-gray-600 mt-1">Registered suppliers</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            Complete list of import orders from all suppliers
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
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/importer/orders"
          className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">View All Orders</p>
              <p className="text-sm text-gray-600">Complete order history</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/importer/documents"
          className="block p-6 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-8 h-8 text-amber-600" />
            <div>
              <p className="font-medium text-gray-900">Review Documents</p>
              <p className="text-sm text-gray-600">{pendingDocs} pending approvals</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/importer/suppliers"
          className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Manage Suppliers</p>
              <p className="text-sm text-gray-600">View supplier performance</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
