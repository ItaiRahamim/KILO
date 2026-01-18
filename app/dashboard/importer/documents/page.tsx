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
import { FileText, Eye, ArrowLeft, Download, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

export default async function DocumentsPage() {
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

    // Fetch all documents for orders belonging to this importer
    const { data: documents } = await supabase
        .from('documents')
        .select(`
      *,
      order:orders!documents_order_id_fkey(
        id,
        po_number,
        product_name,
        supplier:profiles!orders_supplier_id_fkey(full_name, company_name)
      ),
      uploader:profiles!documents_uploader_id_fkey(full_name)
    `)
        .eq('order.importer_id', user.id)
        .order('created_at', { ascending: false });

    const getApprovalStatusBadge = (status: string) => {
        const config: { [key: string]: { color: string; icon: any } } = {
            pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
            approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
            rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
            review_needed: { color: 'bg-purple-100 text-purple-700', icon: Eye },
        };
        return config[status] || config.pending;
    };

    const getAiStatusBadge = (status: string) => {
        const colors: { [key: string]: string } = {
            pending: 'bg-gray-100 text-gray-700',
            processing: 'bg-blue-100 text-blue-700',
            success: 'bg-green-100 text-green-700',
            failed: 'bg-red-100 text-red-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const pendingCount = documents?.filter((d) => d.approval_status === 'pending').length || 0;
    const approvedCount = documents?.filter((d) => d.approval_status === 'approved').length || 0;
    const rejectedCount = documents?.filter((d) => d.approval_status === 'rejected').length || 0;

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
                    <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
                    <p className="text-gray-600 mt-1">
                        Review and approve documents from suppliers
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{documents?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{rejectedCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Documents Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Documents</CardTitle>
                    <CardDescription>
                        Documents uploaded by suppliers for your orders
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!documents || documents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium mb-2">No documents yet</p>
                            <p className="text-sm">Documents will appear here once suppliers upload them</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document</TableHead>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>AI Status</TableHead>
                                        <TableHead>Approval Status</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.map((doc) => {
                                        const StatusIcon = getApprovalStatusBadge(doc.approval_status).icon;
                                        return (
                                            <TableRow key={doc.id}>
                                                <TableCell>
                                                    <div className="flex items-center">
                                                        <FileText className="w-4 h-4 mr-2 text-gray-400" />
                                                        <div>
                                                            <p className="font-medium text-gray-900 text-sm">
                                                                {doc.file_name}
                                                            </p>
                                                            {doc.file_size_bytes && (
                                                                <p className="text-xs text-gray-500">
                                                                    {(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-gray-900 text-sm">
                                                            {doc.order.product_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 font-mono">
                                                            {doc.order.po_number || doc.order.id.slice(0, 8)}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="text-sm text-gray-900">
                                                            {doc.order.supplier.full_name}
                                                        </p>
                                                        {doc.order.supplier.company_name && (
                                                            <p className="text-xs text-gray-500">
                                                                {doc.order.supplier.company_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {doc.category.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getAiStatusBadge(doc.ai_status)}>
                                                        {doc.ai_status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-1">
                                                        <StatusIcon className="w-4 h-4" />
                                                        <Badge className={getApprovalStatusBadge(doc.approval_status).color}>
                                                            {doc.approval_status.replace('_', ' ')}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                            <Button size="sm" variant="outline">
                                                                <Download className="w-4 h-4 mr-1" />
                                                                Download
                                                            </Button>
                                                        </a>
                                                        <Link href={`/dashboard/importer/orders/${doc.order_id}`}>
                                                            <Button size="sm" variant="ghost">
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
