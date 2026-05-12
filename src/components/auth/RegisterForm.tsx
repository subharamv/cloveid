import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { useBranches } from '@/hooks/useBranches';
import { DEPARTMENTS } from '@/types/employee';
import { toast } from 'sonner';
import { Loader2, AlertCircle, Check, X, Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';

const passwordRequirements = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'Contains uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Contains a number', test: (v: string) => /\d/.test(v) },
  { label: 'Contains a special character', test: (v: string) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
];

export default function RegisterForm() {
  const { branches } = useBranches();
  const [dynamicDepartments, setDynamicDepartments] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    name: '',
    employeeId: '',
    branch: '',
    department: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('name')
          .order('name', { ascending: true });
        if (error) throw error;
        setDynamicDepartments(data.map(d => d.name));
      } catch {
        setDynamicDepartments(DEPARTMENTS);
      }
    };
    fetchDepartments();
  }, []);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const passwordsMatch = form.password === form.confirmPassword;
  const allReqs = passwordRequirements.map(r => ({ ...r, passed: r.test(form.password) }));
  const allPassed = allReqs.every(r => r.passed);

  const goNext = () => {
    const required = ['name', 'branch', 'department', 'phone', 'email'];
    setTouched(prev => {
      const next = { ...prev };
      required.forEach(f => { next[f] = true; });
      return next;
    });

    if (!form.name.trim() || !form.branch || !form.department || !form.phone.trim() || !form.email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(prev => ({ ...prev, password: true, confirmPassword: true }));

    if (!allPassed) {
      setError('Please meet all password requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const formattedEmployeeId = form.employeeId.trim() ? `CLOVE-${form.employeeId.trim()}` : '';

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            employee_id: formattedEmployeeId,
            branch: form.branch,
            phone: form.phone.trim() || null,
            department: form.department,
          },
        },
      });

      if (signUpError) {
        if (signUpError.status === 429) {
          toast.error('Too many registration attempts', {
            description: 'Please wait a moment before trying again. This limit helps protect against abuse.',
            duration: 6000,
          });
          setError('Too many attempts. Please wait a few minutes and try again.');
        } else {
          toast.error('Registration failed', {
            description: signUpError.message,
          });
          setError(signUpError.message);
        }
        setIsSubmitting(false);
        return;
      }

      if (signUpData.user) {
        // Upsert profile to handle trigger race condition (trigger may have already created the profile)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: signUpData.user.id,
            full_name: form.name,
            employee_id: formattedEmployeeId || null,
            branch: form.branch || null,
            department: form.department || null,
            phone: form.phone.trim() || null,
            email: form.email.trim(),
            role: 'user',
            is_active: false,
          }, { onConflict: 'id' });

        if (profileError) {
          setError('Failed to create account. Please contact support.');
          setIsSubmitting(false);
          return;
        }

        toast.success('Registration submitted!', {
          description: 'Your account is pending HR approval. You will be notified once an administrator approves your account.',
          duration: 6000,
        });

        await supabase.auth.signOut();
        localStorage.removeItem('auth_cache');

        setForm({ name: '', employeeId: '', branch: '', department: '', phone: '', email: '', password: '', confirmPassword: '' });
        setTouched({});
        setStep(1);
      }
    } catch (err: any) {
      const message = err.message || 'An unexpected error occurred.';
      setError(message);
      toast.error('Registration failed', {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (showError?: boolean) =>
    `form-input flex w-full h-11 rounded-lg text-[#111418] dark:text-white border ${showError ? 'border-red-300 dark:border-red-700' : 'border-[#dbe0e6] dark:border-zinc-700'} bg-white dark:bg-zinc-800 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all px-3.5 text-sm outline-none`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
      <h1 className="text-[#111418] dark:text-white text-[28px] font-bold leading-tight px-4 pb-1 pt-4">Create account</h1>
      <p className="text-[#617289] dark:text-gray-400 text-sm px-4 mb-3">
        {step === 1 ? 'Step 1 of 2 — Your details' : 'Step 2 of 2 — Set a password'}
      </p>

      {/* Step indicator */}
      <div className="flex px-4 gap-2 mb-3">
        <div className={`h-1 flex-1 rounded-full transition-colors ${step === 1 ? 'bg-primary' : 'bg-primary/30'}`} />
        <div className={`h-1 flex-1 rounded-full transition-colors ${step === 2 ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'}`} />
      </div>

      {step === 1 ? (
        <>
          <div className="flex flex-col gap-3 px-4">
            {/* Full Name */}
            <div>
              <label className="text-[#111418] dark:text-gray-200 text-xs font-medium pb-1 block">Full Name</label>
              <input
                className={inputClass()}
                placeholder="JOHN DOE"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value.toUpperCase())}
                onBlur={() => handleBlur('name')}
                required
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className="text-[#111418] dark:text-gray-200 text-xs font-medium pb-1 block">Employee ID</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#617289] dark:text-gray-500 text-sm font-medium pointer-events-none select-none">CLOVE-</span>
                <input
                  className={`${inputClass()} pl-[4.2rem]`}
                  placeholder="123"
                  value={form.employeeId.replace(/^CLOVE-/, '')}
                  onChange={(e) => updateField('employeeId', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Branch + Department row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#111418] dark:text-gray-200 text-xs font-medium pb-1 block">Branch</label>
                <select
                  className={inputClass()}
                  value={form.branch}
                  onChange={(e) => updateField('branch', e.target.value)}
                  required
                >
                  <option value="" disabled>Select</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[#111418] dark:text-gray-200 text-xs font-medium pb-1 block">Department</label>
                <select
                  className={inputClass()}
                  value={form.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  required
                >
                  <option value="" disabled>Select</option>
                  {dynamicDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-[#111418] dark:text-gray-200 text-xs font-medium pb-1 block">Phone Number</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#617289] dark:text-gray-500 text-sm font-medium pointer-events-none select-none">+91</span>
                <input
                  className={`${inputClass()} pl-[3rem]`}
                  placeholder="9876543210"
                  type="tel"
                  value={form.phone.replace(/^\+91\s*/, '')}
                  onChange={(e) => updateField('phone', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[#111418] dark:text-gray-200 text-xs font-medium pb-1 block">Work Email or Email</label>
              <input
                className={inputClass()}
                placeholder="you@company.com"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                onBlur={() => handleBlur('email')}
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

          <div className="px-4 pt-3 pb-4">
            <button
              type="button"
              onClick={goNext}
              className="flex w-full items-center justify-center gap-2 h-12 rounded-lg bg-primary text-white text-sm font-bold transition-all hover:bg-primary/90 focus:ring-4 focus:ring-primary/30"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-4">
            {/* Email (readonly) */}
            <div>
              <label className="text-[#111418] dark:text-gray-200 text-xs font-medium pb-1 block">Account Email</label>
              <div className="flex items-center gap-2 h-11 rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 px-3.5 text-sm text-[#111418] dark:text-white font-medium">
                <Mail size={15} className="text-primary shrink-0" />
                <span className="truncate">{form.email}</span>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[#111418] dark:text-gray-200 text-xs font-medium pb-1 block">Password</label>
              <div className="relative">
                <input
                  className={`${inputClass()} pr-11`}
                  placeholder="Create a strong password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-gray-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {allReqs.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {r.passed ? (
                      <Check size={12} className="text-green-500 shrink-0" />
                    ) : (
                      <X size={12} className="text-gray-400 shrink-0" />
                    )}
                    <span className={`text-xs ${r.passed ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-[#111418] dark:text-gray-200 text-xs font-medium pb-1 block">Confirm Password</label>
              <div className="relative">
                <input
                  className={`${inputClass()} pr-11 ${touched.confirmPassword && !passwordsMatch ? 'border-red-300 dark:border-red-700' : ''}`}
                  placeholder="Re-enter your password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#617289] dark:text-gray-400 hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {touched.confirmPassword && !passwordsMatch && form.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 h-12 rounded-lg bg-primary text-white text-sm font-bold transition-all hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> Registering...</>
              ) : (
                'Create Account'
              )}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); }}
              className="flex items-center justify-center gap-1.5 text-sm text-[#617289] dark:text-gray-400 hover:text-primary transition-colors"
            >
              <ArrowLeft size={15} />
              Back to details
            </button>
          </div>
        </>
      )}
    </form>
  );
}
