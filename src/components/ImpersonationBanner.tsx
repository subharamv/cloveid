import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatingUserId, resetImpersonation, profile } = useAuth();

  if (!isImpersonating || !impersonatingUserId) return null;

  const handleExit = async () => {
    try {
      resetImpersonation();
      toast.success('Exited impersonation mode');
    } catch (error) {
      console.error('Error exiting impersonation:', error);
      toast.error('Failed to exit impersonation');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium">
        <AlertTriangle size={18} className="shrink-0" />
        <span>
          Viewing as
          {profile?.full_name && ` ${profile.full_name}`}
        </span>
        <button
          onClick={handleExit}
          className="ml-1 px-2.5 py-1.5 bg-white text-amber-600 rounded-md flex items-center gap-1.5 text-xs font-semibold hover:bg-amber-50 transition-colors"
        >
          <X size={12} />
          Exit
        </button>
      </div>
    </div>
  );
};