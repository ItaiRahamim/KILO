'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  File,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentCategory } from '@/types';

interface DocumentUploaderProps {
  orderId: string;
  onUploadComplete?: () => void;
}

interface UploadedDocument {
  id: string;
  file_name: string;
  category: DocumentCategory;
  ai_status: string;
  approval_status: string;
  ai_data: any;
  created_at: string;
}

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/5o77v7ejb8xf6g20dgqxbylo4tece2wa';

const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'quote', label: 'Quote' },
  { value: 'proforma_invoice', label: 'Proforma Invoice' },
  { value: 'commercial_invoice', label: 'Commercial Invoice' },
  { value: 'packing_list', label: 'Packing List' },
  { value: 'phytosanitary_certificate', label: 'Phytosanitary Certificate' },
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'euro1_certificate', label: 'EUR1 Certificate' },
  { value: 'other', label: 'Other' },
];

export function DocumentUploader({ orderId, onUploadComplete }: DocumentUploaderProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | null>(null);

  // Fetch existing documents
  useEffect(() => {
    const fetchDocuments = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        console.log('Fetched documents:', data);
        setDocuments(data);
      } else if (error) {
        console.error('Error fetching documents:', error);
      }
    };

    fetchDocuments();
  }, [orderId, supabase]);

  // Polling fallback for document status updates (every 3 seconds)
  useEffect(() => {
    const pollDocuments = async () => {
      // Check if there are any pending/processing documents
      const hasPendingDocs = documents.some(
        (doc) => doc.ai_status === 'pending' || doc.ai_status === 'processing'
      );

      if (!hasPendingDocs) return;

      // Fetch latest status from database
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDocuments(data);

        // Check if any document just completed
        data.forEach((doc) => {
          const oldDoc = documents.find((d) => d.id === doc.id);
          if (
            oldDoc &&
            (oldDoc.ai_status === 'pending' || oldDoc.ai_status === 'processing') &&
            (doc.ai_status === 'success' || doc.ai_status === 'scanned')
          ) {
            toast.success(`${doc.file_name} - AI Analysis Complete!`, {
              description: 'Document processed successfully',
            });
          }
        });
      }
    };

    // Poll every 3 seconds if there are pending documents
    const interval = setInterval(pollDocuments, 3000);

    return () => clearInterval(interval);
  }, [documents, orderId, supabase]);

  // Set up Realtime listener for AI updates
  useEffect(() => {
    const channel = supabase
      .channel(`documents:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Document updated:', payload);

          if (payload.eventType === 'INSERT') {
            setDocuments((prev) => [payload.new as UploadedDocument, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDocuments((prev) =>
              prev.map((doc) =>
                doc.id === (payload.new as UploadedDocument).id
                  ? (payload.new as UploadedDocument)
                  : doc
              )
            );

            // Show toast when AI processing completes
            const updated = payload.new as UploadedDocument;
            if (updated.ai_status === 'success' || updated.ai_status === 'scanned') {
              toast.success(`${updated.file_name} - AI Analysis Complete!`, {
                description: 'Click to view extracted data',
              });
            } else if (updated.ai_status === 'failed') {
              toast.error(`${updated.file_name} - AI Analysis Failed`, {
                description: 'Please check the document and try again',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF or image files.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be logged in to upload documents');
      return;
    }

    setIsUploading(true);

    try {
      console.log('Current user:', user);
      console.log('Inserting document with uploader_id:', user.id);

      // Step 1: Insert document record with pending status
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          order_id: orderId,
          category: 'smart_scan_bundle' as any,
          file_name: selectedFile.name,
          file_url: 'pending', // Temporary, will be updated by Make.com
          file_size_bytes: selectedFile.size,
          mime_type: selectedFile.type,
          ai_status: 'pending',
          approval_status: 'pending',
          uploader_id: user.id,
        })
        .select()
        .single();

      console.log('Document insert result:', { document, error: dbError });

      if (dbError) throw dbError;

      toast.success('Document uploaded! AI processing started...', {
        description: 'You will be notified when analysis is complete',
      });

      // Step 2: Send file to Make.com webhook
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('originalName', selectedFile.name);
      formData.append('documentId', document.id);
      formData.append('orderId', orderId);
      formData.append('category', 'smart_scan_bundle');

      // Send to Make.com (fire and forget)
      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            console.error('Make.com webhook failed:', response.statusText);
            // Update document status to failed
            supabase
              .from('documents')
              .update({ ai_status: 'failed', ai_error_message: 'Webhook failed' })
              .eq('id', document.id)
              .then(() => {
                toast.error('AI processing failed. Please try again.');
              });
          }
        })
        .catch((error) => {
          console.error('Error sending to Make.com:', error);
          supabase
            .from('documents')
            .update({ ai_status: 'failed', ai_error_message: error.message })
            .eq('id', document.id)
            .then(() => {
              toast.error('AI processing failed. Please try again.');
            });
        });

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (aiStatus: string, approvalStatus: string) => {
    if (aiStatus === 'pending' || aiStatus === 'processing') {
      return <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />;
    }
    if (aiStatus === 'failed') {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    if ((aiStatus === 'success' || aiStatus === 'scanned') && approvalStatus === 'approved') {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    if (aiStatus === 'success' || aiStatus === 'scanned') {
      return <Clock className="w-4 h-4 text-blue-600" />;
    }
    return <File className="w-4 h-4 text-gray-400" />;
  };

  const getStatusBadge = (aiStatus: string, approvalStatus: string) => {
    if (aiStatus === 'pending' || aiStatus === 'processing') {
      return <Badge variant="secondary">Processing...</Badge>;
    }
    if (aiStatus === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (approvalStatus === 'approved') {
      return <Badge className="bg-green-600">Approved</Badge>;
    }
    if (approvalStatus === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (approvalStatus === 'review_needed') {
      return <Badge variant="secondary">Review Needed</Badge>;
    }
    if (aiStatus === 'success' || aiStatus === 'scanned') {
      return <Badge variant="outline">Ready for Review</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document Bundle</CardTitle>
          <CardDescription>
            Upload multi-page documents for smart AI analysis and automatic document type detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-300 hover:border-purple-400'
              }`}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <File className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-gray-900">{selectedFile.name}</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600">
                  Drag and drop your document here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, JPG, PNG (max 10MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            {!selectedFile && (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4"
              >
                Select File
              </Button>
            )}
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading & Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            Track your documents and AI analysis status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-1">Upload your first document above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(doc.ai_status, doc.approval_status)}
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
                    {getStatusBadge(doc.ai_status, doc.approval_status)}
                    {(doc.ai_status === 'success' || doc.ai_status === 'scanned') && doc.ai_data && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDocument(doc)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Data
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Analysis Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[85vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Smart Document Analysis</CardTitle>
                  <CardDescription>{selectedDocument.file_name}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDocument(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Type Checklist */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Document Types Detected</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'commercial_invoice', label: 'Commercial Invoice' },
                    { key: 'packing_list', label: 'Packing List' },
                    { key: 'bill_of_lading', label: 'Bill of Lading' },
                    { key: 'phytosanitary_certificate', label: 'Phytosanitary Certificate' },
                    { key: 'eur1_certificate', label: 'EUR1 Certificate' },
                  ].map((docType) => {
                    const foundTypes = selectedDocument.ai_data?.found_types || [];
                    const missingTypes = selectedDocument.ai_data?.missing_types || [];

                    // Fuzzy matching for document types
                    const checkMatch = (types: string[], key: string) => {
                      const aliases: Record<string, string[]> = {
                        'commercial_invoice': ['invoice', 'commercial'],
                        'packing_list': ['packing'],
                        'bill_of_lading': ['lading', 'waybill', 'bol'],
                        'phytosanitary_certificate': ['phyto', 'phytosanitary'],
                        'eur1_certificate': ['eur1', 'eur.1', 'certificate of origin', 'origin'],
                      };

                      return types.some((type: string) => {
                        const typeLower = type.toLowerCase();
                        if (typeLower === key) return true;
                        return (aliases[key] || []).some(alias =>
                          typeLower.includes(alias.toLowerCase())
                        );
                      });
                    };

                    const isFound = checkMatch(foundTypes, docType.key);
                    const isMissing = !isFound && checkMatch(missingTypes, docType.key);

                    return (
                      <div
                        key={docType.key}
                        className={`flex items-center space-x-3 p-3 rounded-lg border ${isFound
                          ? 'bg-green-50 border-green-200'
                          : isMissing
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-gray-50 border-gray-200'
                          }`}
                      >
                        {isFound ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm font-medium ${isFound ? 'text-green-900' : 'text-gray-600'
                          }`}>
                          {docType.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Extracted Data Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Extracted Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Supplier Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Supplier</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">Name</Label>
                        <p className="text-sm font-medium">
                          {selectedDocument.ai_data?.analysis_data?.supplier_name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">VAT Number</Label>
                        <p className="text-sm font-medium">
                          {selectedDocument.ai_data?.analysis_data?.supplier_vat || 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invoice Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Invoice</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">Invoice Number</Label>
                        <p className="text-sm font-medium">
                          {selectedDocument.ai_data?.analysis_data?.invoice_number || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Date</Label>
                        <p className="text-sm font-medium">
                          {selectedDocument.ai_data?.analysis_data?.invoice_date || 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Financial Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Financial</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">Total Amount</Label>
                        <p className="text-sm font-medium">
                          {selectedDocument.ai_data?.analysis_data?.total_price
                            ? `${selectedDocument.ai_data.analysis_data.currency || ''} ${selectedDocument.ai_data.analysis_data.total_price}`
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Currency</Label>
                        <p className="text-sm font-medium">
                          {selectedDocument.ai_data?.analysis_data?.currency || 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shipping Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Shipping</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">Container Number</Label>
                        <p className="text-sm font-medium">
                          {selectedDocument.ai_data?.analysis_data?.container_number || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Phyto Certificate #</Label>
                        <p className="text-sm font-medium">
                          {selectedDocument.ai_data?.analysis_data?.phyto_certificate_number || 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Invoice Line Items */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Invoice Line Items</h3>
                {selectedDocument.ai_data?.analysis_data?.line_items &&
                  selectedDocument.ai_data.analysis_data.line_items.length > 0 ? (
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Item Code
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Origin
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Packaging
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Gross Wt
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Net Wt
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedDocument.ai_data.analysis_data.line_items.map((item: any, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-3 text-sm text-gray-900 font-mono">
                              {item.item_code || 'N/A'}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900">
                              {item.description || 'N/A'}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900">
                              {item.origin || 'N/A'}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900">
                              {item.packaging || 'N/A'}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-right">
                              {item.gross_weight ? `${item.gross_weight} kg` : 'N/A'}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-right">
                              {item.net_weight ? `${item.net_weight} kg` : 'N/A'}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900 text-right">
                              {item.unit_price ? `${selectedDocument.ai_data?.analysis_data?.currency || ''} ${item.unit_price}` : 'N/A'}
                            </td>
                            <td className="px-3 py-3 text-sm font-medium text-gray-900 text-right">
                              {item.total_line_price ? `${selectedDocument.ai_data?.analysis_data?.currency || ''} ${item.total_line_price}` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No line items detected</p>
                )}
              </div>

              {/* Raw Data (Collapsible) */}
              <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 font-medium text-sm hover:bg-gray-50">
                  View Raw AI Data (Advanced)
                </summary>
                <div className="p-4 border-t">
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(selectedDocument.ai_data, null, 2)}
                  </pre>
                </div>
              </details>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

