import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default async function SupplierDashboard() {
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
    .select('role, full_name, company_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'supplier') {
    redirect('/login');
  }

  // Fetch supplier's orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, product_name, total_amount, created_at')
    .eq('supplier_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch supplier's documents
  const { data: documents } = await supabase
    .from('documents')
    .select('id, category, approval_status, ai_status')
    .eq('uploader_id', user.id);

  const totalOrders = orders?.length || 0;
  const activeOrders = orders?.filter((o) => !['completed', 'cancelled'].includes(o.status)).length || 0;
  const pendingDocs = documents?.filter((d) => d.approval_status === 'pending').length || 0;
  const totalValue = orders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile.full_name}
          </h1>
          <p className="text-gray-600 mt-1">
            {profile.company_name && `${profile.company_name} • `}
            Manage your orders and documents
          </p>
        </div>
        <Link href="/dashboard/supplier/orders/new">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Orders</CardTitle>
            <Package className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-gray-600 mt-1">
              {activeOrders} in progress
            </p>
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
            <p className="text-xs text-gray-600 mt-1">Total order value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.length || 0}</div>
            <p className="text-xs text-gray-600 mt-1">
              {pendingDocs} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders}</div>
            <p className="text-xs text-gray-600 mt-1">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Your latest import orders</CardDescription>
              </div>
              <Link href="/dashboard/supplier/orders">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.product_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          ${Number(order.total_amount || 0).toLocaleString()} •
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        order.status === 'completed'
                          ? 'default'
                          : order.status.includes('pending')
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 font-medium mb-2">No orders yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Start by creating your first order
                </p>
                <Link href="/dashboard/supplier/orders/new">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Order
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href="/dashboard/supplier/orders/create-from-quote"
                className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-all shadow-sm"
              >
                <Sparkles className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Smart Order (AI)</p>
                  <p className="text-sm text-gray-600">Create from Quote/PDF</p>
                </div>
              </Link>

              <Link
                href="/dashboard/supplier/orders/new"
                className="flex items-center space-x-3 p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Plus className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">New Order</p>
                  <p className="text-sm text-gray-600">Create order form</p>
                </div>
              </Link>

              <Link
                href="/dashboard/supplier/documents"
                className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Upload Document</p>
                  <p className="text-sm text-gray-600">Add invoices, proformas</p>
                </div>
              </Link>

              <Link
                href="/dashboard/supplier/orders"
                className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">View Orders</p>
                  <p className="text-sm text-gray-600">Check order status</p>
                </div>
              </Link>

              {pendingDocs > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {pendingDocs} Document{pendingDocs > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-600">Awaiting approval</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

