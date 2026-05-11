import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { X, MessageSquare, Loader2, Search } from 'lucide-react';

const EMPLOYEE_ISSUE_TYPES = [
  { value: 'login_issue', label: 'Login Issue' },
  { value: 'app_issue', label: 'App Issue' },
  { value: 'id_card_issue', label: 'ID Card Issue' },
  { value: 'other', label: 'Other' },
];

const VENDOR_ISSUE_TYPES = [
  { value: 'payment_query', label: 'Payment Query' },
  { value: 'card_query', label: 'Card Query' },
  { value: 'other', label: 'Other' },
];

interface RaiseIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RaiseIssueModal: React.FC<RaiseIssueModalProps> = ({ isOpen, onClose }) => {
  const { user, userRole } = useAuth();
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [relatedVendorRequestId, setRelatedVendorRequestId] = useState<number | null>(null);
  const [vendorRequests, setVendorRequests] = useState<any[]>([]);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  const isVendor = userRole === 'vendor';
  const issueTypes = isVendor ? VENDOR_ISSUE_TYPES : EMPLOYEE_ISSUE_TYPES;
  const showCardSelection = isVendor && issueType === 'card_query';

  useEffect(() => {
    if (isOpen) {
      setIssueType('');
      setDescription('');
      setRelatedVendorRequestId(null);
      setCardSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isVendor && isOpen && issueType === 'card_query') {
      fetchVendorRequests();
    }
  }, [isVendor, isOpen, issueType]);

  const fetchVendorRequests = async () => {
    if (!user) return;
    setLoadingCards(true);
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('id, card_details, status, sent_at')
        .eq('vendor_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setVendorRequests(data || []);
    } catch (error) {
      console.error('Error fetching vendor requests:', error);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueType) {
      toast.error('Please select an issue type');
      return;
    }
    if (!description.trim()) {
      toast.error('Please describe your issue');
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('issues').insert({
        user_id: user.id,
        user_role: userRole,
        issue_type: issueType,
        description: description.trim(),
        related_vendor_request_id: relatedVendorRequestId,
        status: 'open',
      });

      if (error) throw error;

      toast.success('Issue raised successfully! Admin will review it shortly.');
      onClose();
    } catch (error: any) {
      console.error('Error raising issue:', error);
      toast.error(error?.message || 'Failed to raise issue');
    } finally {
      setSubmitting(false);
    }
  };

  const getCardLabel = (req: any) => {
    const details = req.card_details;
    const name = details?.fullName || details?.name || 'Unknown';
    const empId = details?.employeeId || '';
    return `${name}${empId ? ` (${empId})` : ''} - #${req.id}`;
  };

  const filteredCardRequests = cardSearchQuery
    ? vendorRequests.filter((req) => {
        const q = cardSearchQuery.toLowerCase();
        const details = req.card_details;
        const name = (details?.fullName || details?.name || '').toLowerCase();
        const empId = (details?.employeeId || '').toLowerCase();
        const id = String(req.id);
        return name.includes(q) || empId.includes(q) || id.includes(q);
      })
    : vendorRequests;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Raise an Issue</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              <option value="">Select issue type</option>
              {issueTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {showCardSelection && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Related Card <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              {loadingCards ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Loading cards...
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={cardSearchQuery}
                      onChange={(e) => setCardSearchQuery(e.target.value)}
                      placeholder="Search by name, employee ID, or card #..."
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
                    <button
                      type="button"
                      onClick={() => setRelatedVendorRequestId(null)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        relatedVendorRequestId === null
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      None (general query)
                    </button>
                    {filteredCardRequests.map((req) => (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => setRelatedVendorRequestId(req.id)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          relatedVendorRequestId === req.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {getCardLabel(req)}
                      </button>
                    ))}
                    {filteredCardRequests.length === 0 && (
                      <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                        No cards match your search.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {vendorRequests.length === 0 && !loadingCards && (
                <p className="text-xs text-muted-foreground mt-1">No card requests found.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Please describe your issue in detail..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RaiseIssueModal;
