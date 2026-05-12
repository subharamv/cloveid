import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import { Plus, Trash2, Save, X, Search, Building2, Hash, FileText, Calendar, ExternalLink } from 'lucide-react';
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
  created_by: string;
  notes: string | null;
  vendor_name?: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  accepted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const OrderRequest = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<AccessoryOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [lanyardCount, setLanyardCount] = useState(0);
  const [holderCount, setHolderCount] = useState(0);
  const [vendorId, setVendorId] = useState('');
  const [notes, setNotes] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
    fetchVendors();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('accessory_orders')
      .select(`
        *,
        vendors (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch orders: ' + error.message);
    } else {
      const formatted = (data || []).map((o: any) => ({
        ...o,
        vendor_name: o.vendors?.name || 'Unassigned',
      }));
      setOrders(formatted);
    }
    setLoading(false);
  };

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, name, email')
      .order('name');

    if (error) {
      console.error('Error fetching vendors:', error);
    } else {
      setVendors(data || []);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (lanyardCount <= 0 && holderCount <= 0) {
      toast.error('Please order at least one item');
      return;
    }
    if (!vendorId) {
      toast.error('Please select a vendor');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('accessory_orders').insert({
      vendor_id: vendorId,
      lanyard_count: lanyardCount,
      holder_count: holderCount,
      notes: notes || null,
      created_by: user.id,
      status: 'pending',
    });

    if (error) {
      toast.error('Failed to create order: ' + error.message);
    } else {
      toast.success('Order created successfully');
      setLanyardCount(0);
      setHolderCount(0);
      setVendorId('');
      setNotes('');
      setShowForm(false);
      fetchOrders();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    const { error } = await supabase.from('accessory_orders').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete order: ' + error.message);
    } else {
      toast.success('Order deleted');
      fetchOrders();
    }
  };

  const handleChangeVendor = async (orderId: number, newVendorId: string) => {
    const { error } = await supabase
      .from('accessory_orders')
      .update({ vendor_id: newVendorId || null })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update vendor: ' + error.message);
    } else {
      toast.success('Vendor updated');
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchVendor = o.vendor_name?.toLowerCase().includes(q);
      const matchStatus = o.status?.toLowerCase().includes(q);
      const matchNotes = o.notes?.toLowerCase().includes(q);
      if (!matchVendor && !matchStatus && !matchNotes) return false;
    }
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  const totalStats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    accepted: orders.filter((o) => o.status === 'accepted').length,
    sent: orders.filter((o) => o.status === 'sent').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    rejected: orders.filter((o) => o.status === 'rejected').length,
    totalLanyards: orders.reduce((sum, o) => sum + o.lanyard_count, 0),
    totalHolders: orders.reduce((sum, o) => sum + o.holder_count, 0),
  };

  return (
    <>
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Accessory Orders</h1>
            <p className="text-muted-foreground text-sm mt-1">Order lanyards and card holders from vendors</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Cancel' : 'New Order'}
          </button>
        </div>

        {showForm && (
          <div className="mb-8 bg-card border rounded-xl overflow-hidden">
            <div className="p-6 border-b bg-muted/20">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Plus size={18} />
                </div>
                Create New Order
              </h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Building2 size={14} className="text-muted-foreground" />
                  Vendor
                </label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-white dark:bg-gray-800 p-2 flex items-center justify-center shadow-sm border">
                      <img src={lanyardImg} alt="Lanyard" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-semibold mb-1">Lanyards</label>
                      <p className="text-xs text-muted-foreground mb-3">Quantity to order</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLanyardCount(Math.max(0, lanyardCount - 1))}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors text-lg font-medium"
                        >-</button>
                        <input
                          type="number"
                          min="0"
                          value={lanyardCount}
                          onChange={(e) => setLanyardCount(parseInt(e.target.value) || 0)}
                          className="w-16 text-center px-2 py-1.5 border rounded-lg bg-background text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => setLanyardCount(lanyardCount + 1)}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors text-lg font-medium"
                        >+</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-white dark:bg-gray-800 p-2 flex items-center justify-center shadow-sm border">
                      <img src={cardHolderImg} alt="Card Holder" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-semibold mb-1">Card Holders</label>
                      <p className="text-xs text-muted-foreground mb-3">Quantity to order</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setHolderCount(Math.max(0, holderCount - 1))}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors text-lg font-medium"
                        >-</button>
                        <input
                          type="number"
                          min="0"
                          value={holderCount}
                          onChange={(e) => setHolderCount(parseInt(e.target.value) || 0)}
                          className="w-16 text-center px-2 py-1.5 border rounded-lg bg-background text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => setHolderCount(holderCount + 1)}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors text-lg font-medium"
                        >+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <FileText size={14} className="text-muted-foreground" />
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                  placeholder="Any special instructions..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium"
                >
                  <Save size={16} />
                  {saving ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Pending</p>
            <p className="text-2xl font-bold mt-1">{totalStats.pending}</p>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Accepted</p>
            <p className="text-2xl font-bold mt-1">{totalStats.accepted}</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Sent</p>
            <p className="text-2xl font-bold mt-1">{totalStats.sent}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</p>
            <p className="text-2xl font-bold mt-1">{totalStats.completed}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border">
            <p className="text-xs text-muted-foreground font-medium">Total Items</p>
            <p className="text-2xl font-bold mt-1">{totalStats.totalLanyards + totalStats.totalHolders}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by vendor, status, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-background"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="sent">Sent</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase"><Hash size={12} className="inline mr-1" />ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase"><Building2 size={12} className="inline mr-1" />Vendor</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Lanyards</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Holders</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase"><FileText size={12} className="inline mr-1" />Notes</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase"><Calendar size={12} className="inline mr-1" />Date</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">No orders found</td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-mono">#{order.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-muted-foreground shrink-0" />
                          {order.vendor_id ? (
                            <select
                              value={order.vendor_id || ''}
                              onChange={(e) => handleChangeVendor(order.id, e.target.value)}
                              className="text-sm bg-transparent border-none p-0 cursor-pointer focus:ring-0"
                            >
                              {vendors.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                              <option value="">Unassign</option>
                            </select>
                          ) : (
                            <select
                              value=''
                              onChange={(e) => handleChangeVendor(order.id, e.target.value)}
                              className="text-sm bg-transparent border-none p-0 cursor-pointer focus:ring-0 text-muted-foreground"
                            >
                              <option value=''>Unassigned</option>
                              {vendors.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <img src={lanyardImg} alt="" className="w-4 h-4 object-contain opacity-60" />
                          {order.lanyard_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <img src={cardHolderImg} alt="" className="w-4 h-4 object-contain opacity-60" />
                          {order.holder_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-800'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {order.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground text-right whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderRequest;
