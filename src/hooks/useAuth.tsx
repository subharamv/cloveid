import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

const CACHE_KEY = 'auth_cache';

interface CachedAuth {
    session: Session | null;
    userRole: string | null;
    isActive: boolean | null;
    profile: any | null;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    userRole: string | null;
    isActive: boolean | null;
    profile: any | null;
    loading: boolean;
    logout: () => Promise<void>;
    clearSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isActive, setIsActive] = useState<boolean | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const loadingRef = useRef(true);
    const mounted = useRef(true);
    const navigate = useNavigate();

    // Sync loadingRef with loading state
    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    const getCachedAuth = (): CachedAuth | null => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    };

    const setCachedAuth = (session: Session | null, userRole: string | null, isActive: boolean | null, profileData: any | null = null) => {
        try {
            if (session) {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ session, userRole, isActive, profile: profileData }));
            } else {
                localStorage.removeItem(CACHE_KEY);
            }
        } catch (error) {
            console.error('Error caching auth:', error);
        }
    };

    const getProfile = async (userId: string, retries = 2): Promise<any | null> => {
        if (!userId) {
            console.error('getProfile called without userId');
            return null;
        }

        for (let i = 0; i <= retries; i++) {
            if (!navigator.onLine) {
                console.warn('Network offline, skipping profile fetch');
                return null;
            }

            const controller = new AbortController();
            const timeoutDuration = 15000 + (i * 5000); // 15s, 20s, 25s
            const timeoutId = setTimeout(() => {
                console.warn(`Profile fetch attempt ${i + 1} timing out after ${timeoutDuration}ms`);
                controller.abort();
            }, timeoutDuration);

            try {
                console.log(`Fetching profile for user ${userId} (attempt ${i + 1}/${retries + 1})`);
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single()
                    .abortSignal(controller.signal);

                clearTimeout(timeoutId);

                if (error) {
                    if (error.code === 'PGRST116') {
                        console.warn('Profile not found in database for user:', userId);
                        return null;
                    }
                    throw error;
                }

                if (profile) {
                    console.log('Profile fetched successfully:', { role: profile.role, is_active: profile.is_active });
                    return profile;
                }

                console.warn('Profile query returned no data');
                return null;
            } catch (err: unknown) {
                clearTimeout(timeoutId);
                const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('timeout'));
                const errorMessage = err instanceof Error ? err.message : String(err);

                if (i === retries) {
                    console.error(`Profile fetch failed after ${retries + 1} attempts:`, errorMessage);
                    return null;
                }

                const retryDelay = 1000 * (i + 1);
                console.warn(`Profile fetch attempt ${i + 1} ${isTimeout ? 'timed out' : 'failed'}: ${errorMessage}. Retrying in ${retryDelay / 1000}s...`);
                await new Promise(r => setTimeout(r, retryDelay));
            }
        }
        return null;
    };

    const handleClearAuth = useCallback((isExplicitLogout = false) => {
        console.log('Clearing auth state...', { isExplicitLogout });
        
        // Safety: If we are on the reset password page, do NOT clear the state or redirect
        // unless it's an explicit logout action. This prevents timing issues from
        // kicking users out of the recovery flow.
        if (window.location.pathname === '/reset-password' && !isExplicitLogout) {
            console.log('handleClearAuth ignored because user is on /reset-password');
            return;
        }

        if (mounted.current) {
            setSession(null);
            setUserRole(null);
            setIsActive(null);
            setProfile(null);
            setCachedAuth(null, null, null, null);
            setLoading(false);
        }

        if (isExplicitLogout) {
            localStorage.removeItem(CACHE_KEY);
            // Also clear any supabase persistent state if we're in a broken state
            Object.keys(localStorage).forEach(key => {
                if (key.includes('supabase.auth.token') || key.includes('sb-')) {
                    localStorage.removeItem(key);
                }
            });
        }

        if (window.location.pathname !== '/' && window.location.pathname !== '/unauthorized' && window.location.pathname !== '/reset-password') {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const initInProgress = useRef(false);

    const logout = useCallback(async () => {
        console.log('Logout initiated...');
        const timeoutId = setTimeout(() => {
            console.warn('Logout timed out after 10s, forcing local cleanup');
            handleClearAuth(true);
        }, 10000);

        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Supabase signOut error:', error);
            } else {
                console.log('Supabase signOut successful');
            }
        } catch (error) {
            console.error('Error during signOut exception:', error);
        } finally {
            clearTimeout(timeoutId);
            console.log('Cleaning up local auth state...');
            handleClearAuth(true);
        }
    }, [handleClearAuth]);

    const clearSession = useCallback(async () => {
        console.log('Manual clear session triggered');
        handleClearAuth(true);
    }, [handleClearAuth]);

    const initAuth = useCallback(async () => {
        if (initInProgress.current) {
            console.log('Auth initialization already in progress, skipping');
            return;
        }
        initInProgress.current = true;

        const timeoutId = setTimeout(() => {
            if (loadingRef.current && mounted.current) {
                console.warn('Auth initialization timed out after 60s, forcing loading to false');
                setLoading(false);
            }
        }, 60000);

        try {
            console.log('Initializing auth, verifying session...');
            
            // Wrap getSession in a promise with timeout - set to 45s
            const sessionPromise = supabase.auth.getSession();
            const sessionTimeout = new Promise<{ data: { session: Session | null }, error: any }>((_, reject) => 
                setTimeout(() => {
                    console.error('getSession timeout reached (45s)');
                    reject(new Error('getSession timeout'));
                }, 45000)
            );

            console.log('Awaiting session promise...');
            const { data: { session: supabaseSession }, error } = await Promise.race([
                sessionPromise,
                sessionTimeout as any
            ]);
            console.log('Session promise resolved:', { hasSession: !!supabaseSession, error });

            if (error) {
                console.error('Supabase getSession error:', error);
                // If it's just a timeout, don't clear everything yet, maybe we have cached data
                if (error.message !== 'getSession timeout') {
                    handleClearAuth(false);
                } else {
                    console.warn('Proceeding with cached auth (if any) due to getSession timeout');
                }
                return;
            }

            if (!mounted.current) return;

            if (supabaseSession) {
                console.log('Session found for user:', supabaseSession.user.id);
                
                // If we are on the reset password page, we don't need a profile immediately
                if (window.location.pathname === '/reset-password') {
                    console.log('initAuth: Reset password page detected, skipping profile fetch');
                    setSession(supabaseSession);
                    setLoading(false);
                    return;
                }

                // Validate cache is for the same user
                const cached = getCachedAuth();
                const isCacheValid = cached?.session?.user?.id === supabaseSession.user.id;
                
                const profile = await getProfile(supabaseSession.user.id);

                if (!mounted.current) return;

                // Priority: fresh profile > user_metadata > valid cache > defaults
                const role = profile?.role || supabaseSession.user.user_metadata?.role || (isCacheValid ? cached?.userRole : null);
                const active = profile?.is_active ?? (isCacheValid ? cached?.isActive : null) ?? (role === 'admin' ? true : null);

                console.log('Auth verification complete:', { role, active });

                setSession(supabaseSession);
                setUserRole(role);
                setIsActive(active);
                setProfile(profile || (isCacheValid ? cached?.profile : null));

                if (role) {
                    setCachedAuth(supabaseSession, role, active, profile || (isCacheValid ? cached?.profile : null));
                }
            } else {
                console.log('No active session found');
                handleClearAuth(false);
            }
        } catch (error) {
            console.error('Error in initAuth:', error);
            if (mounted.current) {
                handleClearAuth(false);
            }
        } finally {
            clearTimeout(timeoutId);
            initInProgress.current = false;
            if (mounted.current) {
                setLoading(false);
            }
        }
    }, [handleClearAuth]);

    const inactivityTimeout = 24 * 60 * 60 * 1000; // 24 hours
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetInactivityTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (session && userRole === 'admin') {
            timerRef.current = setTimeout(() => {
                console.log('Inactivity timeout reached, logging out...');
                logout();
            }, inactivityTimeout);
        }
    }, [session, userRole, logout]);

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const handleActivity = () => resetInactivityTimer();

        if (session && userRole === 'admin') {
            events.forEach(event => window.addEventListener(event, handleActivity));
            resetInactivityTimer();
        }

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [session, userRole, resetInactivityTimer]);

    useEffect(() => {
        mounted.current = true;

        // Restore from cache optimistically, but keep loading=true until verified
        const cached = getCachedAuth();
        if (cached && cached.session?.user?.id) {
            console.log('Found cached auth for user:', cached.session.user.id, '- restoring optimistically');
            setSession(cached.session);
            setUserRole(cached.userRole);
            setIsActive(cached.isActive);
            setProfile(cached.profile);
            // Keep loading=true until we verify with server
        } else {
            console.log('No valid cached auth found');
        }

        // Set up auth state change listener BEFORE initAuth to catch all events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!mounted.current) return;

            const isResetPasswordRoute = window.location.pathname === '/reset-password';
            console.log('Auth state change event:', event, 'user:', currentSession?.user?.id, 'isResetRoute:', isResetPasswordRoute);

            if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED' || (event === 'SIGNED_IN' && isResetPasswordRoute)) {
                console.log(`Auth event ${event} detected during reset/recovery - skipping profile fetch`);
                setSession(currentSession);
                setLoading(false);
                return;
            }

            if (currentSession) {
                // Validate cache is for the same user
                const cached = getCachedAuth();
                const isCacheValid = cached?.session?.user?.id === currentSession.user.id;

                // Always fetch fresh profile data on auth state changes
                const profile = await getProfile(currentSession.user.id);

                if (!mounted.current) {
                    console.log('Component unmounted during profile fetch, skipping state update');
                    return;
                }

                // Priority: fresh profile > user_metadata > valid cache > defaults
                const role = profile?.role || currentSession.user.user_metadata?.role || (isCacheValid ? cached?.userRole : null);
                const active = profile?.is_active ?? (isCacheValid ? cached?.isActive : null) ?? (role === 'admin' ? true : null);

                console.log('Auth state update processed:', { event, role, active });

                setSession(currentSession);
                setUserRole(role);
                setIsActive(active);
                setProfile(profile || (isCacheValid ? cached?.profile : null));

                if (role) {
                    setCachedAuth(currentSession, role, active, profile || (isCacheValid ? cached?.profile : null));
                }
            } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                console.log('Auth event:', event, '- clearing session');
                handleClearAuth(true);
            } else {
                if (isResetPasswordRoute) {
                    console.log('Ignoring state clear for event:', event, 'on reset-password route');
                    setLoading(false);
                    return;
                }
                console.log('Auth event:', event, 'with no session - clearing state');
                handleClearAuth(false);
            }

            if (mounted.current) {
                setLoading(false);
            }
        });

        // Now initialize auth - this will trigger the onAuthStateChange listener
        initAuth();

        // Monitor online/offline status
        const handleOnline = () => {
            console.log('App is online, reinitializing auth');
            initAuth();
        };

        const handleOffline = () => {
            console.warn('App is offline');
            // We don't necessarily want to logout on offline, but maybe show a warning
            // For now, let's just keep the session but be aware
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            mounted.current = false;
            subscription.unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [initAuth, handleClearAuth]);

    const value = {
        session,
        user: session?.user ?? null,
        userRole,
        isActive,
        profile,
        loading,
        logout,
        clearSession
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};