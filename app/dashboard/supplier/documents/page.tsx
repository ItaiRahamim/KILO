import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import SupplierDocumentsClient from './client';

export default async function SupplierDocumentsPage() {
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

  if (!profile || profile.role !== 'supplier') {
    redirect('/login');
  }

  // Fetch supplier's orders (exclude draft - must be approved by importer first)
  const { data: orders } = await supabase
    .from('orders')
    .select('id, product_name, status, created_at, po_number')
    .eq('supplier_id', user.id)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Documents</h1>
          <p className="text-gray-600 mt-2">
            Upload invoices, certificates, and other documents for AI analysis
          </p>
        </div>

        {/* Main Content */}
        <SupplierDocumentsClient orders={orders || []} />
      </div>
    </div>
  );
}
