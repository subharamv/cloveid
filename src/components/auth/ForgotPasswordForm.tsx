import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        toast.success('Reset link sent!', {
          description: 'Please check your email for the password reset link.',
        });
        onBack();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#617289] dark:text-gray-400 hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Login
        </button>
      </div>
      <h1 className="text-[#111418] dark:text-white text-[28px] font-bold leading-tight px-4 pb-1 pt-4">Reset Password</h1>
      <p className="text-[#617289] dark:text-gray-400 text-sm px-4 mb-4">Enter your email and we'll send you a reset link.</p>

      <div className="flex flex-col gap-3 px-4">
        <div>
          <label className="text-[#111418] dark:text-gray-200 text-sm font-medium pb-1.5 block">Work Email or Email</label>
          <input
            className="form-input flex w-full h-12 rounded-lg text-[#111418] dark:text-white border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all px-4 text-sm outline-none"
            placeholder="you@company.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="px-4 py-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 h-12 rounded-lg bg-primary text-white text-sm font-bold transition-all hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </div>
    </form>
  );
}
