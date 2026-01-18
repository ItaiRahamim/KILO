'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, AlertCircle, ArrowRight, Sparkles, ArrowLeft, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function CreateOrderFromQuotePage() {
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ⚠️ Important: This uses the existing webhook. The 'action' flag routes it correctly in Make.
    const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || 'YOUR_WEBHOOK_URL_HERE';

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf' || droppedFile.type.startsWith('image/')) {
                setFile(droppedFile);
                setError(null);
            } else {
                setError('Please upload a PDF or Image file');
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);
        // 🚩 CRITICAL: This flag tells Make.com to run the "New Order" flow
        formData.append('action', 'create_order');

        try {
            // 1. Send file to AI
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to analyze document');

            const data = await response.json();
            console.log('AI Response:', data);

            // 2. Store analysis data and show dashboard
            setAnalysisData(data);
            setIsUploading(false);

            toast.success('Quote analyzed successfully!', {
                description: 'Review the details below',
            });

        } catch (err) {
            console.error(err);
            setError('Failed to process the quote. Please try again.');
            setIsUploading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setAnalysisData(null);
        setError(null);
    };

    const handleCreateOrder = () => {
        console.log('Order Created with data:', analysisData);
        toast.success('Order created successfully!');
        // Redirect to orders page
        setTimeout(() => {
            router.push('/dashboard/supplier/orders');
        }, 1000);
    };

    // If we have analysis data, show the dashboard
    if (analysisData) {
        return (
            <div className="max-w-7xl mx-auto p-8">
                {/* Header */}
                <div className="mb-6">
                    <Button variant="ghost" onClick={handleReset} className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Upload
                    </Button>
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-8 h-8 text-purple-600" />
                        <h1 className="text-3xl font-bold text-gray-900">Quote Analysis Results</h1>
                    </div>
                    <p className="text-gray-600">Review the extracted details before creating the order</p>
                </div>

                {/* Top Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Supplier Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Supplier</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <Label className="text-xs text-gray-500">Name</Label>
                                <p className="text-sm font-medium">
                                    {analysisData.order_details?.supplier_name || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <Label className="text-xs text-gray-500">VAT Number</Label>
                                <p className="text-sm font-medium">
                                    {analysisData.order_details?.supplier_vat || 'N/A'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Details Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Order Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <Label className="text-xs text-gray-500">Importer Name</Label>
                                <p className="text-sm font-medium">
                                    {analysisData.order_details?.importer_name || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <Label className="text-xs text-gray-500">Currency</Label>
                                <p className="text-sm font-medium">
                                    {analysisData.order_details?.currency || 'N/A'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Financial</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <Label className="text-xs text-gray-500">Total Amount</Label>
                                <p className="text-sm font-medium">
                                    {analysisData.order_details?.total_order_amount
                                        ? `${analysisData.order_details.currency || ''} ${analysisData.order_details.total_order_amount}`
                                        : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <Label className="text-xs text-gray-500">Invoice Number</Label>
                                <p className="text-sm font-medium">
                                    {analysisData.order_details?.invoice_number || 'N/A'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Payment Terms */}
                {analysisData.payment_terms && analysisData.payment_terms.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Payment Terms</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {analysisData.payment_terms.map((term: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {term.percent}% - {term.name || 'Payment'}
                                                </p>
                                                {term.amount && (
                                                    <p className="text-sm text-gray-600">
                                                        {analysisData.order_details?.currency || ''} {term.amount}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Line Items Table */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Line Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {analysisData.items &&
                            analysisData.items.length > 0 ? (
                            <div className="border rounded-lg overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Code</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Packaging</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Qty</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Unit Price</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {analysisData.items.map((item: any, index: number) => (
                                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                                    {item.item_code || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {item.description || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {item.packaging || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                    {item.quantity || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                    {item.unit_price ? `${analysisData.order_details?.currency || ''} ${item.unit_price}` : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                                    {item.total_line_price ? `${analysisData.order_details?.currency || ''} ${item.total_line_price}` : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No line items detected</p>
                        )}
                    </CardContent>
                </Card>

                {/* Action Bar */}
                <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 rounded-lg border">
                    <Button variant="outline" onClick={handleReset}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreateOrder} className="bg-purple-600 hover:bg-purple-700">
                        <Check className="w-4 h-4 mr-2" />
                        Approve & Create Order
                    </Button>
                </div>
            </div>
        );
    }

    // Upload UI (shown when no analysis data)
    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    Smart Order Creation
                </h1>
                <p className="text-gray-500 mt-2">
                    Upload your Quote or Proforma Invoice, and AI will build the order for you.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div
                    className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${isDragging ? 'border-purple-500 bg-purple-50' :
                        file ? 'border-green-500 bg-green-50' :
                            'border-gray-300 hover:border-purple-400'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,image/*"
                        className="hidden"
                    />

                    {!file && !isUploading && (
                        <div className="flex flex-col items-center gap-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                                <Upload className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-lg font-medium text-gray-900">Click to upload or drag & drop</p>
                                <p className="text-sm text-gray-500">PDF, JPG or PNG</p>
                            </div>
                            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                                Select File
                            </button>
                        </div>
                    )}

                    {file && !isUploading && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setFile(null)} className="px-4 py-2 text-gray-600 hover:text-red-600 font-medium">
                                    Change
                                </button>
                                <button onClick={handleSubmit} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2">
                                    Analyze & Build Order <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                            <p className="font-medium text-purple-900">AI is reading your document...</p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
