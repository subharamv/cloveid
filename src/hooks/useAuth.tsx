import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

const CACHE_KEY = 'auth_cache';

interface CachedAuth {
    session: Session | null;
    userRole: string | null;
    isActive: boolean | null;
}

interface Profile {
    role: string | null;
    is_active: boolean | null;
    full_name?: string | null;
    branch?: string | null;
    employee_id?: string | null;
    phone?: string | null;
    blood_group?: string | null;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    userRole: string | null;
    isActive: boolean | null;
    loading: boolean;
    logout: () => Promise<void>;
    profile: Profile | null;
    refreshProfile: () => Promise<void>;
    clearSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isActive, setIsActive] = useState<boolean | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
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

    const setCachedAuth = (session: Session | null, userRole: string | null, isActive: boolean | null) => {
        try {
            if (session) {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ session, userRole, isActive }));
            } else {
                localStorage.removeItem(CACHE_KEY);
            }
        } catch (error) {
            console.error('Error caching auth:', error);
        }
    };

    const getProfile = async (userId: string, retries = 2) => {
        for (let i = 0; i <= retries; i++) {
            if (!navigator.onLine) {
                console.warn('Network offline, skipping profile fetch');
                return null;
            }

            const controller = new AbortController();
            const timeoutDuration = 10000 + (i * 5000); // 10s, 15s, 20s
            const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role, is_active, full_name, branch, employee_id, phone, blood_group')
                    .eq('id', userId)
                    .single()
                    .abortSignal(controller.signal);

                clearTimeout(timeoutId);

                if (error) {
                    if (error.code === 'PGRST116') {
                        console.warn('Profile not found for user:', userId);
                        return null;
                    }
                    // Check if it's an auth error (session expired)
                    if (error.message?.includes('JWT') || error.message?.includes('session') || error.code === '401') {
                        console.error('Auth error fetching profile, session may be expired:', error);
                        handleClearAuth(true);
                        return null;
                    }
                    throw error;
                }
                return profile;
            } catch (err: unknown) {
                clearTimeout(timeoutId);
                const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('timeout'));
                const isAuthError = err instanceof Error && (err.message?.includes('JWT') || err.message?.includes('session'));

                if (isAuthError) {
                    console.error('Auth error in profile fetch, clearing session');
                    handleClearAuth(true);
                    return null;
                }

                if (i === retries) {
                    console.error('Final exception fetching profile:', err);
                    return null;
                }

                const retryDelay = 1000 * (i + 1);
                console.warn(`Profile fetch attempt ${i + 1} ${isTimeout ? 'timeout' : 'failed'}, retrying in ${retryDelay/1000}s...`, err);
                await new Promise(r => setTimeout(r, retryDelay));
            }
        }
        return null;
    };

    const handleClearAuth = useCallback((isExplicitLogout = false) => {
        console.log('Clearing auth state...', { isExplicitLogout });
        if (mounted.current) {
            setSession(null);
            setUserRole(null);
            setIsActive(null);
            setProfile(null);
            setCachedAuth(null, null, null);
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

        if (window.location.pathname !== '/' && window.location.pathname !== '/unauthorized') {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const logout = useCallback(async () => {
        console.log('Logout initiated...');
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
            console.log('Cleaning up local auth state...');
            if (mounted.current) {
                setSession(null);
                setUserRole(null);
                setIsActive(null);
                setProfile(null);
            }
            localStorage.removeItem(CACHE_KEY);
            Object.keys(localStorage).forEach(key => {
                if (key.includes('supabase.auth.token') || key.includes('sb-')) {
                    localStorage.removeItem(key);
                }
            });
            console.log('Redirecting to login...');
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const initAuth = useCallback(async () => {
        const timeoutId = setTimeout(() => {
            if (loadingRef.current && mounted.current) {
                console.warn('Auth initialization timed out, forcing loading to false');
                setLoading(false);
            }
        }, 20000); // 20s timeout

        try {
            console.log('Initializing auth...');
            const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Supabase getSession error:', error);
                handleClearAuth(false);
                return;
            }

            if (mounted.current) {
                if (supabaseSession) {
                    console.log('Session found, fetching profile for user:', supabaseSession.user.id);
                    const profileData = await getProfile(supabaseSession.user.id);

                    if (mounted.current) {
                        const cached = getCachedAuth();
                        const role = profileData?.role || supabaseSession.user.user_metadata?.role || (cached?.session?.user?.id === supabaseSession.user.id ? cached?.userRole : null);
                        const active = profileData?.is_active ?? (cached?.session?.user?.id === supabaseSession.user.id ? cached?.isActive : null) ?? (role === 'admin' ? true : null);

                        if (role) {
                            console.log('Auth finalized with profile:', { role, active });
                            setSession(supabaseSession);
                            setUserRole(role);
                            setIsActive(active);
                            setProfile(profileData);
                            setCachedAuth(supabaseSession, role, active);
                        } else {
                            // Session exists but role still unknown
                            console.warn('Session exists but role unknown, keeping session for now.');
                            setSession(supabaseSession);
                            setProfile(profileData);
                            // We don't clear auth here, maybe the user is just a basic user with no profile record yet
                        }
                    }
                } else {
                    console.log('No session found, clearing auth');
                    handleClearAuth(false);
                }
            }
        } catch (error) {
            console.error('Error in initAuth:', error);
            if (mounted.current) {
                // Don't clear auth on transient errors, just stop loading
                setLoading(false);
            }
        } finally {
            clearTimeout(timeoutId);
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

        const cached = getCachedAuth();
        if (cached && cached.session) {
            setSession(cached.session);
            setUserRole(cached.userRole);
            setIsActive(cached.isActive);
            // We set loading false early if we have cache to show UI immediately
            setLoading(false);
        }

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!mounted.current) return;

            console.log('Auth state changed:', event);

            if (currentSession) {
                // If it's a login or token refresh, we might need to fetch profile
                const profileData = await getProfile(currentSession.user.id);
                if (mounted.current) {
                    const cached = getCachedAuth();
                    setSession(currentSession);
                    const role = profileData?.role || currentSession.user.user_metadata?.role || (cached?.session?.user?.id === currentSession.user.id ? cached?.userRole : null);
                    const active = profileData?.is_active ?? (cached?.session?.user?.id === currentSession.user.id ? cached?.isActive : null) ?? (role === 'admin' ? true : null);

                    console.log('Auth state updated:', { role, active, event });
                    setUserRole(role);
                    setIsActive(active);
                    setProfile(profileData);
                    setCachedAuth(currentSession, role, active);
                }
            } else if (event === 'SIGNED_OUT') {
                handleClearAuth(true);
            }

            if (mounted.current) {
                setLoading(false);
            }
        });

        // Monitor online/offline status
        const handleOnline = () => {
            console.log('App is online');
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

    const refreshProfile = useCallback(async () => {
        if (!session?.user?.id) {
            console.warn('Cannot refresh profile: no active session');
            return;
        }

        console.log('Refreshing profile data...');
        const profileData = await getProfile(session.user.id);

        if (mounted.current && profileData) {
            setProfile(profileData);
            setUserRole(profileData.role);
            setIsActive(profileData.is_active);
            setCachedAuth(session, profileData.role, profileData.is_active);
            console.log('Profile refreshed successfully');
        }
    }, [session, getProfile]);

    const clearSession = useCallback(async () => {
        console.log('Force clearing session...');
        try {
            // Force sign out
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error during force signOut:', error);
        } finally {
            // Clear all auth state
            if (mounted.current) {
                setSession(null);
                setUserRole(null);
                setIsActive(null);
                setProfile(null);
            }

            // Clear all storage
            localStorage.removeItem(CACHE_KEY);
            localStorage.clear(); // Clear everything
            sessionStorage.clear();

            // Clear all supabase keys
            Object.keys(localStorage).forEach(key => {
                if (key.includes('supabase') || key.includes('sb-')) {
                    localStorage.removeItem(key);
                }
            });

            console.log('Session cleared, redirecting to login...');
            navigate('/', { replace: true });
            window.location.reload(); // Force page reload
        }
    }, [navigate]);

    const value = {
        session,
        user: session?.user ?? null,
        userRole,
        isActive,
        loading,
        logout,
        profile,
        refreshProfile,
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