import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  MessageSquare, X, CheckCircle2, Clock, AlertCircle, Send,
  Loader2, User, Reply, Archive
} from 'lucide-react';

interface Issue {
  id: number;
  user_id: string;
  user_role: string;
  issue_type: string;
  description: string;
  related_vendor_request_id: number | null;
  status: string;
  admin_reply: string | null;
  replied_by: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <AlertCircle size={14} />,
  in_progress: <Clock size={14} />,
  resolved: <CheckCircle2 size={14} />,
  closed: <Archive size={14} />,
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  resolved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  closed: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  login_issue: 'Login Issue',
  app_issue: 'App Issue',
  id_card_issue: 'ID Card Issue',
  payment_query: 'Payment Query',
  card_query: 'Card Query',
  other: 'Other',
};

interface AdminIssuesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminIssuesPanel: React.FC<AdminIssuesPanelProps> = ({ isOpen, onClose }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [profiles, setProfiles] = useState<Record<string, { full_name: string; email: string }>>({});

  const replyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchIssues();
    }
  }, [isOpen]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);

      const userIds = [...new Set((data || []).map((i: Issue) => i.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profileData) {
          const map: Record<string, { full_name: string; email: string }> = {};
          profileData.forEach((p: any) => {
            map[p.id] = { full_name: p.full_name || 'Unknown', email: p.email || '' };
          });
          setProfiles(map);
        }
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (issueId: number) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setSubmittingReply(true);
    try {
      const updateData: any = {
        admin_reply: replyText.trim(),
        replied_at: new Date().toISOString(),
      };
      if (newStatus) {
        updateData.status = newStatus;
      }

      const { error } = await supabase
        .from('issues')
        .update(updateData)
        .eq('id', issueId);

      if (error) throw error;

      toast.success('Reply sent successfully');
      setReplyingTo(null);
      setReplyText('');
      setNewStatus('');
      fetchIssues();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusChange = async (issueId: number, status: string) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', issueId);

      if (error) throw error;
      toast.success(`Issue marked as ${status}`);
      fetchIssues();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update status');
    }
  };

  const filteredIssues = filter === 'all'
    ? issues
    : issues.filter((i) => i.status === filter);

  const getStatusIcon = (status: string) => STATUS_ICONS[status] || <AlertCircle size={14} />;
  const getStatusColor = (status: string) => STATUS_COLORS[status] || STATUS_COLORS.open;

  const getIssueTypeLabel = (type: string) => ISSUE_TYPE_LABELS[type] || type;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 pointer-events-none">
      <div className="absolute inset-0 backdrop-blur-sm" />
      <div className="pointer-events-auto relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Issues & Support</h2>
            {!loading && (
              <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {issues.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                  filter === s
                    ? 'bg-white dark:bg-gray-900 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {getStatusIcon(s)}
                {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading issues...</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <CheckCircle2 size={26} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No issues found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filter === 'all' ? 'No issues have been raised yet.' : `No ${filter} issues.`}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              {filteredIssues.map((issue) => {
                const profile = profiles[issue.user_id];
                return (
                  <div
                    key={issue.id}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User size={13} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate leading-tight">
                              {profile?.full_name || 'Loading...'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate leading-tight">
                              {profile?.email || ''}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusColor(issue.status)}`}>
                          {getStatusIcon(issue.status)}
                          {issue.status === 'in_progress' ? 'In Progress' : issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {getIssueTypeLabel(issue.issue_type)}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {issue.user_role === 'vendor' ? 'Vendor' : issue.user_role === 'user' ? 'Employee' : issue.user_role}
                          </span>
                          {issue.related_vendor_request_id && (
                            <span className="text-xs text-muted-foreground">
                              Card #: {issue.related_vendor_request_id}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(issue.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{issue.description}</p>

                        {issue.admin_reply && (
                          <div className="p-2.5 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/10">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Reply size={11} className="text-primary" />
                              <span className="text-xs font-medium text-primary">Admin Reply</span>
                              {issue.replied_at && (
                                <span className="text-xs text-muted-foreground">{formatDate(issue.replied_at)}</span>
                              )}
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{issue.admin_reply}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        {!replyingTo || replyingTo !== issue.id ? (
                          <button
                            onClick={() => {
                              setReplyingTo(issue.id);
                              setReplyText('');
                              setNewStatus('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary border border-primary hover:bg-primary hover:text-white transition-all"
                          >
                            <Reply size={11} />
                            Reply
                          </button>
                        ) : (
                          <div className="w-full space-y-2.5" ref={replyRef}>
                            <div className="flex flex-wrap gap-2">
                              <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                              >
                                <option value="">Keep current status</option>
                                <option value="in_progress">Mark In Progress</option>
                                <option value="resolved">Mark Resolved</option>
                                <option value="closed">Mark Closed</option>
                              </select>
                              <button
                                onClick={() => handleStatusChange(issue.id, 'resolved')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 border border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
                              >
                                <CheckCircle2 size={11} />
                                Resolve
                              </button>
                            </div>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={2}
                              placeholder="Type your reply..."
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setReplyingTo(null); setReplyText(''); setNewStatus(''); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleReply(issue.id)}
                                disabled={submittingReply || !replyText.trim()}
                                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                              >
                                {submittingReply ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                {submittingReply ? 'Sending...' : 'Send Reply'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminIssuesPanel;
