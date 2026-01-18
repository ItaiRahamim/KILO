import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrokerOrdersTable } from '@/components/features/broker/BrokerOrdersTable';

export default async function BrokerDashboard() {
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

  if (!profile || profile.role !== 'broker') {
    redirect('/login');
  }

  // Fetch orders for the broker
  // Statuses: shipped, customs_clearance (arrived), released
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      product_name,
      estimated_arrival_date,
      status,
      importer:profiles!orders_importer_id_fkey(full_name)
    `)
    .in('status', ['shipped', 'customs_clearance', 'released'])
    .eq('broker_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching broker orders:', error);
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Broker Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {profile.full_name}. Manage your active shipments and customs clearances.
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Active Shipments</CardTitle>
          <CardDescription>
            Monitor and release shipments currently in transit or at customs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrokerOrdersTable initialOrders={orders || []} />
        </CardContent>
      </Card>
    </div>
  );
}

