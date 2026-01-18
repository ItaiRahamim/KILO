import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentUploader } from '@/components/features/documents/DocumentUploader';
import {
  Package,
  DollarSign,
  TruckIcon,
  Calendar,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import type { SizeConfiguration } from '@/types';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('supplier_id', user.id)
    .single();

  console.log('Order Error:', error);
  console.log('Fetched Order:', order);

  if (error || !order) {
    redirect('/dashboard/supplier/orders');
  }

  // Verify user has access to this order
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'supplier' && order.supplier_id !== user.id) {
    redirect('/dashboard/supplier/orders');
  }

  const sizesJson = order.sizes_json as unknown as SizeConfiguration;
  const paymentTerms = order.payment_terms_json as unknown as any[];

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
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/supplier/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Order Details
            </h1>
            <p className="text-gray-600 mt-1">
              {order.po_number || `Order #${order.id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(order.status)}>
          {order.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Order Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-purple-600" />
              <CardTitle>Product Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Product</p>
              <p className="font-medium text-gray-900">
                {order.product_name}
                {order.variety && ` (${order.variety})`}
              </p>
            </div>

            {order.packaging && (
              <div>
                <p className="text-sm text-gray-600">Packaging</p>
                <p className="font-medium text-gray-900">{order.packaging}</p>
              </div>
            )}

            {order.kg_per_box && (
              <div>
                <p className="text-sm text-gray-600">Weight per Box</p>
                <p className="font-medium text-gray-900">{order.kg_per_box} kg</p>
              </div>
            )}

            {order.hs_code && (
              <div>
                <p className="text-sm text-gray-600">HS Code</p>
                <p className="font-medium text-gray-900">{order.hs_code}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600">Size Configuration</p>
              <Badge variant="outline">
                {sizesJson.type === 'uniform' ? 'Uniform' : 'Mixed'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <CardTitle>Financial Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Quantity</p>
              <p className="font-medium text-gray-900">
                {order.total_quantity?.toLocaleString() || 0} boxes
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-purple-600">
                ${order.total_amount?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Currency</p>
              <p className="font-medium text-gray-900">{order.currency || 'USD'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TruckIcon className="w-5 h-5 text-blue-600" />
              <CardTitle>Shipping Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.port_of_loading && (
              <div>
                <p className="text-sm text-gray-600">Port of Loading</p>
                <p className="font-medium text-gray-900">{order.port_of_loading}</p>
              </div>
            )}

            {order.port_of_discharge && (
              <div>
                <p className="text-sm text-gray-600">Port of Discharge</p>
                <p className="font-medium text-gray-900">{order.port_of_discharge}</p>
              </div>
            )}

            {order.container_number && (
              <div>
                <p className="text-sm text-gray-600">Container Number</p>
                <p className="font-medium text-gray-900">{order.container_number}</p>
              </div>
            )}

            {order.vessel_name && (
              <div>
                <p className="text-sm text-gray-600">Vessel</p>
                <p className="font-medium text-gray-900">{order.vessel_name}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-medium text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Size Details */}
      <Card>
        <CardHeader>
          <CardTitle>Size Configuration</CardTitle>
          <CardDescription>
            {sizesJson.type === 'uniform'
              ? 'Uniform size configuration'
              : 'Mixed size configuration'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sizesJson.type === 'uniform' ? (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Size</p>
                  <p className="font-medium text-gray-900">{sizesJson.size}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantity</p>
                  <p className="font-medium text-gray-900">
                    {sizesJson.quantity.toLocaleString()} boxes
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Price per Box</p>
                  <p className="font-medium text-gray-900">
                    ${sizesJson.price_per_unit.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sizesJson.items.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Size #{index + 1}</p>
                      <p className="font-medium text-gray-900">{item.size}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantity</p>
                      <p className="font-medium text-gray-900">
                        {item.quantity.toLocaleString()} boxes
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price per Box</p>
                      <p className="font-medium text-gray-900">
                        ${item.price_per_unit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="font-medium text-gray-900">
                        ${(item.quantity * item.price_per_unit).toFixed(2)}
                      </p>
                    </div>
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
          <CardTitle>Payment Terms</CardTitle>
          <CardDescription>Payment milestones and amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentTerms.map((term, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-purple-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {term.stage}
                    </p>
                    <p className="text-sm text-gray-600">{term.percent}% of total</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  ${term.amount?.toFixed(2) || '0.00'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parties - Temporarily removed until we fix the join */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">...</div> */}

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <CardTitle>Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Document Uploader */}
      <DocumentUploader orderId={id} />
    </div>
  );
}

