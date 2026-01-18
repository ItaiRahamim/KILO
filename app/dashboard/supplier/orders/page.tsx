import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Search, Calendar, DollarSign, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default async function SupplierOrdersPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'supplier') {
    redirect('/login');
  }

  // Fetch supplier's orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('supplier_id', user.id)
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
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-1">
            Manage your import orders and track their status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/supplier/orders/create-from-quote">
            <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <Sparkles className="w-4 h-4 mr-2" />
              Smart Import (PDF)
            </Button>
          </Link>
          <Link href="/dashboard/supplier/orders/new">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {orders && orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">
                {orders.length}
              </div>
              <p className="text-sm text-gray-600">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">
                {orders.filter((o) => o.status.includes('pending')).length}
              </div>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {orders.filter((o) =>
                  ['shipped', 'customs_clearance', 'released'].includes(o.status)
                ).length}
              </div>
              <p className="text-sm text-gray-600">In Transit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === 'completed').length}
              </div>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            View and manage all your import orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!orders || orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No orders yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start by creating your first import order
              </p>
              <Link href="/dashboard/supplier/orders/new">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Order
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/supplier/orders/${order.id}`}
                  className="block"
                >
                  <div className="p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 hover:border-purple-300 transition-all">
                    <div className="flex items-center justify-between">
                      {/* Left: Product Info */}
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {order.product_name}
                              {order.variety && ` (${order.variety})`}
                            </h3>
                            {order.po_number && (
                              <span className="text-sm text-gray-500">
                                #{order.po_number}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                            {order.total_quantity && (
                              <span className="flex items-center">
                                <Package className="w-3 h-3 mr-1" />
                                {order.total_quantity.toLocaleString()} boxes
                              </span>
                            )}
                            {order.total_amount && (
                              <span className="flex items-center">
                                <DollarSign className="w-3 h-3 mr-1" />
                                ${order.total_amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Badge */}
                      <div className="flex-shrink-0 ml-4">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

