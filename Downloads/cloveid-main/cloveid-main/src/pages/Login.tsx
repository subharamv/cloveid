import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import cloveLogo from '../assets/CLOVE LOGO BLACK.png';
import idCardMockup from '../assets/Hanging-ID-Card-Mockup-01.jpg';
import { toast } from 'sonner';

import RoleSelectionDialog from '@/components/RoleSelectionDialog';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { session, userRole, isActive, loading, logout } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [branch, setBranch] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoginView, setIsLoginView] = useState(true);
    const [showRoleDialog, setShowRoleDialog] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isAuthStuck, setIsAuthStuck] = useState(false);

    const clearSiteData = () => {
        console.log("Clearing site data and performing hard reset...");
        localStorage.clear();
        sessionStorage.clear();
        // Clear cookies (basic attempt)
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.reload();
    };

    useEffect(() => {
        let stuckTimeout: NodeJS.Timeout;
        if (session && !userRole && !loading) {
            stuckTimeout = setTimeout(() => {
                setIsAuthStuck(true);
            }, 5000);
        } else {
            setIsAuthStuck(false);
        }
        return () => clearTimeout(stuckTimeout);
    }, [session, userRole, loading]);

    useEffect(() => {
        const checkRedirect = async () => {
            if (!loading && session) {
                const role = userRole || session.user.user_metadata?.role;
                
                if (!role) {
                    console.warn("Session exists but role is missing, waiting for auth update...");
                    return;
                }

                if (isActive === false) {
                    setError("Your account is pending approval from HR.");
                    return;
                }
                
                // Avoid redirect loop if already on login and showing error
                if (error && error.includes("pending approval")) return;

                if (role === 'admin' || role === 'manager') {
                    setShowRoleDialog(true);
                } else if (role === 'vendor') {
                    navigate('/vendor-dashboard', { replace: true });
                } else {
                    navigate('/user-dashboard', { replace: true });
                }
            }
        };
        
        checkRedirect();
    }, [session, userRole, isActive, loading, navigate]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-[#617289] dark:text-gray-400 text-sm animate-pulse">Initializing application...</p>
                </div>
            </div>
        );
    }

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (loginError) {
                setError(loginError.message);
                setIsSubmitting(false);
                // Clear cache on specific authentication errors that might be related to stuck state
                if (loginError.message.includes('refresh_token_not_found') || 
                    loginError.message.includes('Invalid login credentials')) {
                    console.warn("Login failure detected, clearing cache...");
                    localStorage.removeItem('auth_cache');
                }
                return;
            }

            if (!loginData.user) {
                setError("Login failed. Please try again.");
                setIsSubmitting(false);
                return;
            }

            // The useAuth hook will handle the state update and redirection 
            // via onAuthStateChange, but we can also handle it here for faster response
            // Add a timeout to the profile fetch to prevent hanging
            const fetchProfileWithTimeout = async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
                
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
                console.error("Profile fetch error or timeout:", profileError);
                // Fallback to metadata
                const role = loginData.user.user_metadata?.role;
                if (!role) {
                    // One more try if metadata is missing, or just show error
                    setError("Could not determine user role. Please try again or contact support.");
                    // Don't sign out immediately, maybe it's just a transient error
                    setIsSubmitting(false);
                    return;
                }
            }

            if (profile && profile.is_active === false) {
                setError("Your account is pending approval from HR.");
                await supabase.auth.signOut();
                setIsSubmitting(false);
                return;
            }

            // Redirection will happen in useEffect when state updates
        } catch (err: any) {
            console.error("Login exception:", err);
            setError("A connection error occurred. Please check your internet.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');

        // Format employee ID with CLOVE- prefix
        const formattedEmployeeId = employeeId.trim() ? `CLOVE-${employeeId.trim()}` : '';

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: name,
                    employee_id: formattedEmployeeId,
                    branch,
                    phone: phone.trim() || null,
                },
            },
        });

        if (signUpError) {
            setError(signUpError.message);
            setIsSubmitting(false);
            return;
        }

        if (signUpData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: signUpData.user.id,
                    full_name: name,
                    employee_id: formattedEmployeeId || null,
                    branch: branch || null,
                    phone: phone.trim() || null,
                    role: 'user',
                    is_active: false, // Default to false for new users
                }, { onConflict: 'id' });

            if (profileError) {
                setError('Failed to create user profile. Please try again.');
                setIsSubmitting(false);
                return;
            }

            // Show success toast
            toast.success('Registration Successful!', {
                description: 'Your account has been created. Please check your email to verify your account. Once verified, your account will be pending approval from HR/Admin.',
                duration: 6000,
            });

            await supabase.auth.signOut();
            localStorage.removeItem('auth_cache');

            // Clear form fields
            setName('');
            setEmployeeId('');
            setBranch('');
            setPhone('');
            setEmail('');
            setPassword('');

            setIsLoginView(true); // Switch to login view
        }

        setIsSubmitting(false);
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <RoleSelectionDialog
                isOpen={showRoleDialog}
                onClose={() => setShowRoleDialog(false)}
                onAdminRedirect={() => navigate('/dashboard')}
                onUserRedirect={() => navigate('/user-dashboard')}
            />
            <div className="layout-container flex h-full grow flex-col">
                <div className="flex flex-1 justify-center">
                    <div className="layout-content-container flex w-full flex-1">
                        <div className="grid w-full grid-cols-1 md:grid-cols-2">
                            {/* Left Side - Branding */}
                            <div className="flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 md:p-10">
                                <div className="flex w-full max-w-md flex-col gap-6 rounded-lg bg-white dark:bg-background-dark md:bg-transparent md:dark:bg-transparent p-6 md:p-0">
                                    <div className="flex items-center gap-3">
                                        <img src={cloveLogo} alt="Clove" className="h-8" />
                                    </div>
                                    <div className="flex flex-col gap-2 text-left">
                                        <h2 className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Welcome to the Company ID Portal</h2>
                                        <p className="text-[#617289] dark:text-gray-400 text-base font-normal leading-normal">Generate and manage your official company identification with ease and security. Please sign in or create an account to get started.</p>
                                    </div>
                                    <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg" style={{ backgroundImage: `url(${idCardMockup})` }}></div>
                                </div>
                            </div>
                            {/* Right Side - Auth Forms */}
                            <div className="flex flex-col items-center justify-center bg-white dark:bg-zinc-900/50 p-6 md:p-10">
                                <div className="w-full max-w-md">
                                    <div className="flex px-4 py-3">
                                        <div className="flex h-10 flex-1 items-center justify-center rounded-lg bg-background-light dark:bg-background-dark p-1">
                                            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 ${isLoginView ? 'bg-white dark:bg-zinc-700 shadow-[0_0_4px_rgba(0,0,0,0.1)] text-[#111418] dark:text-white' : 'text-[#617289] dark:text-gray-400'} text-sm font-medium leading-normal`} onClick={() => setIsLoginView(true)}>
                                                <span className="truncate">Login</span>
                                                <input defaultChecked className="invisible w-0" name="auth-toggle" type="radio" value="Login" />
                                            </label>
                                            <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 ${!isLoginView ? 'bg-white dark:bg-zinc-700 shadow-[0_0_4px_rgba(0,0,0,0.1)] text-[#111418] dark:text-white' : 'text-[#617289] dark:text-gray-400'} text-sm font-medium leading-normal`} onClick={() => setIsLoginView(false)}>
                                                <span className="truncate">Register</span>
                                                <input className="invisible w-0" name="auth-toggle" type="radio" value="Register" />
                                            </label>
                                        </div>
                                    </div>
                                    {isLoginView ? (
                                        <>
                                            <form className="flex flex-col" onSubmit={handleLogin}>
                                                <h1 className="text-[#111418] dark:text-white tracking-light text-[32px] font-bold leading-tight px-4 text-left pb-3 pt-6">Sign In</h1>
                                                <div className="flex w-full flex-col gap-4 px-4 py-3">
                                                    <label className="flex flex-col min-w-40 flex-1">
                                                        <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Work Email</p>
                                                        <input
                                                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                                            placeholder="you@company.com"
                                                            type="email"
                                                            name="email"
                                                            autoComplete="email"
                                                            value={email}
                                                            onChange={(event) => setEmail(event.target.value)}
                                                            required
                                                        />
                                                    </label>
                                                    <label className="flex flex-col min-w-40 flex-1">
                                                        <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Password</p>
                                                        <div className="flex w-full flex-1 items-stretch rounded-lg">
                                                            <input
                                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] border-r-0 pr-2 text-base font-normal leading-normal"
                                                                placeholder="Enter your password"
                                                                type={showPassword ? 'text' : 'password'}
                                                                name="password"
                                                                autoComplete="current-password"
                                                                value={password}
                                                                onChange={(event) => setPassword(event.target.value)}
                                                                required
                                                            />
                                                            <div
                                                                className="text-[#617289] dark:text-gray-400 flex border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 items-center justify-center pr-[15px] rounded-r-lg border-l-0 cursor-pointer"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                            >
                                                                <span className="material-symbols-outlined text-2xl">
                                                                    {showPassword ? 'visibility_off' : 'visibility'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                                {error && (
                                                    <p className="px-4 text-sm font-medium text-red-500" role="alert">
                                                        {error}
                                                    </p>
                                                )}
                                                {isAuthStuck && (
                                                    <div className="mx-4 my-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                        <p className="text-sm text-amber-800 dark:text-amber-400 mb-2">
                                                            Authentication is taking longer than expected.
                                                        </p>
                                                        <div className="flex flex-col gap-2">
                                                            <button 
                                                                type="button"
                                                                onClick={() => logout()}
                                                                className="text-sm font-bold text-amber-900 dark:text-amber-300 underline hover:no-underline text-left"
                                                            >
                                                                Sign out and try again
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={clearSiteData}
                                                                className="text-sm font-bold text-red-600 dark:text-red-400 underline hover:no-underline text-left"
                                                            >
                                                                Hard Reset (Clear Cache & Reload)
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center px-4 py-3">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input 
                                                            className="form-checkbox h-4 w-4 rounded border-gray-300 dark:border-zinc-600 text-primary focus:ring-primary bg-background-light dark:bg-zinc-800" 
                                                            type="checkbox" 
                                                            checked={rememberMe}
                                                            onChange={(e) => setRememberMe(e.target.checked)}
                                                        />
                                                        <span className="text-[#111418] dark:text-gray-300 text-sm font-medium">Remember Me</span>
                                                    </label>
                                                    <a className="text-sm font-medium text-primary hover:underline" href="#">Forgot Password?</a>
                                                </div>
                                                <div className="px-4 py-3">
                                                    <button
                                                        type="submit"
                                                        disabled={isSubmitting}
                                                        className="flex w-full items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] transition hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <span className="truncate">{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                                                    </button>
                                                </div>
                                            </form>
                                        </>
                                    ) : (
                                        <form className="flex flex-col" onSubmit={handleRegister}>
                                            <h1 className="text-[#111418] dark:text-white tracking-light text-[32px] font-bold leading-tight px-4 text-left pb-3 pt-6">Create Account</h1>
                                            <div className="flex w-full flex-col gap-4 px-4 py-3">
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Full Name</p>
                                                    <input
                                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                                        placeholder="John Doe"
                                                        type="text"
                                                        name="name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        required
                                                    />
                                                </label>
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Employee ID</p>
                                                    <div className="relative">
                                                        <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#617289] dark:text-gray-500 font-medium select-none pointer-events-none">
                                                            CLOVE-
                                                        </span>
                                                        <input
                                                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 pl-[4.5rem] pr-[15px] py-[15px] text-base font-normal leading-normal"
                                                            placeholder="123"
                                                            type="text"
                                                            name="employeeId"
                                                            value={employeeId}
                                                            onChange={(e) => setEmployeeId(e.target.value.replace(/^CLOVE-/, ''))}
                                                            required
                                                        />
                                                    </div>
                                                </label>
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Branch</p>
                                                    <select
                                                        className="form-select flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                                        name="branch"
                                                        value={branch}
                                                        onChange={(e) => setBranch(e.target.value)}
                                                        required
                                                    >
                                                        <option value="" disabled>Select a branch</option>
                                                        <option value="HYD">HYD</option>
                                                        <option value="VIZAG">VIZAG</option>
                                                    </select>
                                                </label>
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Phone Number</p>
                                                    <div className="relative">
                                                        <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[#617289] dark:text-gray-500 font-medium select-none pointer-events-none">
                                                            +91
                                                        </span>
                                                        <input
                                                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 pl-[3.5rem] pr-[15px] py-[15px] text-base font-normal leading-normal"
                                                            placeholder="9876543210"
                                                            type="tel"
                                                            name="phone"
                                                            autoComplete="tel"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value.replace(/^\+91\s*/, ''))}
                                                            required
                                                        />
                                                    </div>
                                                </label>
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Work Email</p>
                                                    <input
                                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal"
                                                        placeholder="you@company.com"
                                                        type="email"
                                                        name="email"
                                                        autoComplete="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        required
                                                    />
                                                </label>
                                                <label className="flex flex-col min-w-40 flex-1">
                                                    <p className="text-[#111418] dark:text-gray-200 text-base font-medium leading-normal pb-2">Password</p>
                                                    <div className="flex w-full flex-1 items-stretch rounded-lg">
                                                        <input
                                                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-primary h-14 placeholder:text-[#617289] dark:placeholder:text-gray-500 p-[15px] border-r-0 pr-2 text-base font-normal leading-normal"
                                                            placeholder="Create a password"
                                                            type={showPassword ? 'text' : 'password'}
                                                            name="password"
                                                            autoComplete="new-password"
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            required
                                                        />
                                                        <div
                                                            className="text-[#617289] dark:text-gray-400 flex border border-[#dbe0e6] dark:border-zinc-700 bg-white dark:bg-zinc-800 items-center justify-center pr-[15px] rounded-r-lg border-l-0 cursor-pointer"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        >
                                                            <span className="material-symbols-outlined text-2xl">
                                                                {showPassword ? 'visibility_off' : 'visibility'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                            {error && (
                                                <p className="px-4 text-sm font-medium text-red-500" role="alert">
                                                    {error}
                                                </p>
                                            )}
                                            <div className="px-4 py-3">
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="flex w-full items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] transition hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <span className="truncate">{isSubmitting ? 'Registering...' : 'Register'}</span>
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                    <div className="mt-6 text-center border-t border-gray-100 dark:border-zinc-800 pt-4">
                                        <button 
                                            type="button"
                                            onClick={clearSiteData}
                                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            Trouble logging in? Reset Site Data & Cache
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;