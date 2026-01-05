import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import cloveLogo from '../assets/CLOVE LOGO BLACK.png';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { session: authSession } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Watch for session from AuthProvider
    useEffect(() => {
        if (authSession) {
            console.log("ResetPassword: Session detected from AuthProvider");
            setIsLoading(false);
        }
    }, [authSession]);

    // Cleanup and handle timeouts
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (isLoading) {
                console.log("ResetPassword: Link verification timeout");
                setError("Your password reset link is invalid or has expired.");
                setIsLoading(false);
            }
        }, 10000);

        return () => clearTimeout(timeout);
    }, [isLoading]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                setError(updateError.message);
            } else {
                toast.success('Password updated!', {
                    description: 'Your password has been reset successfully. You can now login with your new password.',
                });
                // Clear any auth cache to force a clean login
                localStorage.removeItem('auth_cache');
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-[#617289] dark:text-gray-400 text-sm animate-pulse">Verifying recovery link...</p>
                    <p className="text-xs text-gray-400 max-w-xs mt-4">
                        If this takes more than 30 seconds, your connection might be slow or the link may be invalid.
                    </p>
                    <button 
                        onClick={() => navigate('/')}
                        className="mt-6 text-primary hover:underline text-sm font-medium"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden items-center justify-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-xl rounded-2xl p-8 border border-gray-100 dark:border-zinc-800">
                <div className="flex flex-col items-center mb-8">
                    <img src={cloveLogo} alt="Clove" className="h-10 mb-6" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Password</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-center mt-2">Please enter your new password below.</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg mb-6">
                        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
                        <button 
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="text-xs font-semibold text-red-700 dark:text-red-300 underline"
                        >
                            Clear Cache & Retry
                        </button>
                    </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 px-4 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                placeholder="Min 6 characters"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <span className="material-symbols-outlined">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-12 px-4 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            placeholder="Confirm your new password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Updating...' : 'Reset Password'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
