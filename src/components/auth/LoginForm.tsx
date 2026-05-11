import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onForgotPassword: () => void;
  onSuccess: () => void;
}

export default function LoginForm({ onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        setError(loginError.message);
        if (loginError.message.includes('refresh_token_not_found') ||
            loginError.message.includes('Invalid login credentials')) {
          localStorage.removeItem('auth_cache');
        }
        setIsSubmitting(false);
        return;
      }

      if (!loginData.user) {
        setError('Login failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const fetchProfileWithTimeout = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role, is_active')
            .eq('id', loginData.user.id)
            .single()
            .abortSignal(controller.signal);
          clearTimeout(timeoutId);
          return { data, error };
        } catch (err: any) {
          clearTimeout(timeoutId);
          return { data: null, error: err };
        }
      };

      const { data: profile, error: profileError } = await fetchProfileWithTimeout();

      if (profileError) {
        const role = loginData.user.user_metadata?.role;
        if (!role) {
          setError('Could not determine user role. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      if (profile && profile.is_active === false) {
        setError('Your account is pending approval from HR.');
        await supabase.auth.signOut();
        setIsSubmitting(false);
        return;
      }
    } catch (err: any) {
      setError(err.message || 'A connection error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
      <h1 className="text-[#111418] dark:text-white text-[28px] font-bold leading-tight px-4 pb-1 pt-4">Welcome back</h1>
      <p className="text-[#617289] dark:text-gray-400 text-sm px-4 mb-4">Sign in to your Clove ID account</p>

      <div className="flex flex-col gap-3 px-4">
        <div>
          <label className="text-[#111418] dark:text-gray-200 text-sm font-medium leading-normal pb-1.5 block">Work Email or Email</label>
          <input
            className="form-input flex w-full h-12 rounded-lg text-[#111418] dark:text-white border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all px-4 text-sm outline-none"
            placeholder="you@company.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-[#111418] dark:text-gray-200 text-sm font-medium leading-normal pb-1.5 block">Password</label>
          <div className="relative">
            <input
              className="form-input flex w-full h-12 rounded-lg text-[#111418] dark:text-white border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all px-4 pr-11 text-sm outline-none"
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-gray-400 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center px-4 py-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            className="form-checkbox h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-primary focus:ring-primary/30 bg-background-light dark:bg-zinc-800"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span className="text-[#111418] dark:text-gray-300 text-sm">Remember me</span>
        </label>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Forgot Password?
        </button>
      </div>

      <div className="px-4 pb-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 h-12 rounded-lg bg-primary text-white text-sm font-bold transition-all hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </div>
    </form>
  );
}
