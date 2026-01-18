'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface Order {
  id: string;
  product_name: string;
  estimated_arrival_date: string | null;
  status: string;
  importer: {
    full_name: string;
  } | null;
}

interface BrokerOrdersTableProps {
  initialOrders: Order[];
}

export function BrokerOrdersTable({ initialOrders }: BrokerOrdersTableProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleRelease = async (orderId: string) => {
    try {
      setUpdatingId(orderId);
      
      const { error } = await supabase
        .from('orders')
        .update({ status: 'released' })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Shipment released successfully');
      
      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status: 'released' } : order
        )
      );
      
      // Refresh server data
      router.refresh();
    } catch (error: any) {
      console.error('Error releasing shipment:', error);
      toast.error(error.message || 'Failed to release shipment');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      shipped: 'bg-blue-100 text-blue-700',
      customs_clearance: 'bg-purple-100 text-purple-700',
      released: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatStatus = (status: string) => {
    if (status === 'customs_clearance') return 'Arrived / At Customs';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No active shipments found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Importer Name</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Arrival Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">
                {order.id.slice(0, 8)}...
              </TableCell>
              <TableCell>{order.importer?.full_name || 'N/A'}</TableCell>
              <TableCell className="font-medium">{order.product_name}</TableCell>
              <TableCell>
                {order.estimated_arrival_date
                  ? new Date(order.estimated_arrival_date).toLocaleDateString()
                  : 'TBD'}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.status)}>
                  {formatStatus(order.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {order.status !== 'released' && (
                  <Button
                    onClick={() => handleRelease(order.id)}
                    disabled={updatingId === order.id}
                    className="h-9 rounded-md px-3 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updatingId === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Release Shipment
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
