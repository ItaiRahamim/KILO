import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  DollarSign,
  TruckIcon,
  Calendar,
  FileText,
  ArrowLeft,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { SizeConfiguration } from '@/types';
import ApproveOrderButton from './ApproveOrderButton';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ImporterOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user is importer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'importer') {
    redirect('/login');
  }

  // Fetch order with related data
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('importer_id', user.id)
    .single();

  console.log('Order Error:', error);
  console.log('Fetched Order:', order);

  if (error || !order) {
    redirect('/dashboard/importer');
  }

  // Fetch documents for this order
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

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

  const getDocumentStatusIcon = (aiStatus: string, approvalStatus: string) => {
    if (aiStatus === 'pending' || aiStatus === 'processing') {
      return <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />;
    }
    if (aiStatus === 'failed') {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    if (approvalStatus === 'approved') {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    if (approvalStatus === 'rejected') {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    if (aiStatus === 'success' || aiStatus === 'scanned') {
      return <Clock className="w-4 h-4 text-blue-600" />;
    }
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  const getDocumentStatusBadge = (aiStatus: string, approvalStatus: string) => {
    if (aiStatus === 'pending' || aiStatus === 'processing') {
      return <Badge variant="secondary">Processing...</Badge>;
    }
    if (aiStatus === 'failed') {
      return <Badge variant="destructive">AI Failed</Badge>;
    }
    if (approvalStatus === 'approved') {
      return <Badge className="bg-green-600">Approved</Badge>;
    }
    if (approvalStatus === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (approvalStatus === 'review_needed') {
      return <Badge className="bg-amber-600">Review Needed</Badge>;
    }
    if ((aiStatus === 'success' || aiStatus === 'scanned') && approvalStatus === 'pending') {
      return <Badge className="bg-blue-600">Ready for Review</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/importer">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600 mt-1">
              {order.po_number || `Order #${order.id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(order.status)}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Badge>
          {order.status === 'draft' && <ApproveOrderButton orderId={id} />}
        </div>
      </div>

      {/* Draft Warning */}
      {order.status === 'draft' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
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

      {/* Order Info Grid - Same as supplier view */}
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
                    <p className="font-medium text-gray-900 capitalize">{term.stage}</p>
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
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">Supplier ID: {order.supplier_id}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Importer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">Importer ID: {order.importer_id}</p>
            </div>
          </CardContent>
        </Card>
      </div> */}

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

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Uploaded documents for this order</CardDescription>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-1">Documents will appear here once uploaded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getDocumentStatusIcon(doc.ai_status, doc.approval_status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doc.category.replace('_', ' ')} •{' '}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getDocumentStatusBadge(doc.ai_status, doc.approval_status)}
                    {(doc.ai_status === 'success' || doc.ai_status === 'scanned') && (
                      <Link href={`/dashboard/importer/orders/${id}/review/${doc.id}`}>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

