import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import { Check, X, Send, CheckCircle2, Package, Clock, AlertCircle, Ban } from 'lucide-react';
import lanyardImg from '@/assets/lanyard.png';
import cardHolderImg from '@/assets/card-holder.png';

interface AccessoryOrder {
  id: number;
  created_at: string;
  updated_at: string;
  vendor_id: string | null;
  lanyard_count: number;
  holder_count: number;
  status: string;
  notes: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  accepted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const VendorOrders = () => {
  const { effectiveUserId } = useAuth();
  const [orders, setOrders] = useState<AccessoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (effectiveUserId) fetchOrders();
  }, [effectiveUserId]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('accessory_orders')
      .select('*')
      .eq('vendor_id', effectiveUserId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch orders: ' + error.message);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: number, newStatus: string) => {
    const { error } = await supabase
      .from('accessory_orders')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update order: ' + error.message);
    } else {
      toast.success(`Order ${newStatus} successfully`);
      fetchOrders();
    }
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((o) => o.status === filter);

  return (
    <>
      <AppHeader />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Accessory Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Lanyards and card holder orders assigned to you</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-yellow-600 dark:text-yellow-400" />
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Pending</p>
            </div>
            <p className="text-xl font-bold">{orders.filter(o => o.status === 'pending').length}</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-1">
              <Check size={14} className="text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Accepted</p>
            </div>
            <p className="text-xl font-bold">{orders.filter(o => o.status === 'accepted').length}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <Send size={14} className="text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Sent</p>
            </div>
            <p className="text-xl font-bold">{orders.filter(o => o.status === 'sent').length}</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</p>
            </div>
            <p className="text-xl font-bold">{orders.filter(o => o.status === 'completed').length}</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <Ban size={14} className="text-red-600 dark:text-red-400" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Rejected</p>
            </div>
            <p className="text-xl font-bold">{orders.filter(o => o.status === 'rejected').length}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border">
            <div className="flex items-center gap-2 mb-1">
              <Package size={14} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">Total Items</p>
            </div>
            <p className="text-xl font-bold">{orders.reduce((s, o) => s + o.lanyard_count + o.holder_count, 0)}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'pending', 'accepted', 'sent', 'completed', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  ({orders.filter((o) => o.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-5 bg-card border rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-muted-foreground">#{order.id}</span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <img src={lanyardImg} alt="" className="w-4 h-4 object-contain opacity-60" />
                        <strong>{order.lanyard_count}</strong> lanyards
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <img src={cardHolderImg} alt="" className="w-4 h-4 object-contain opacity-60" />
                        <strong>{order.holder_count}</strong> card holders
                      </span>
                      <span className="text-muted-foreground text-xs">
                        <Clock size={12} className="inline mr-1" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {order.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{order.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(order.id, 'accepted')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                        >
                          <Check size={14} />
                          Accept
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'rejected')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </>
                    )}
                    {order.status === 'accepted' && (
                      <button
                        onClick={() => updateStatus(order.id, 'sent')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                      >
                        <Send size={14} />
                        Mark Sent
                      </button>
                    )}
                    {order.status === 'sent' && (
                      <button
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle2 size={14} />
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default VendorOrders;
