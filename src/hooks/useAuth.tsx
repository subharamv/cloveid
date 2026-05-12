import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

const CACHE_KEY = 'auth_cache';
const PROFILE_REQUIRED_FIELDS = ['designation', 'blood_group', 'branch', 'department', 'phone'] as const;

interface CachedAuth {
    userId: string | null;
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
    authReady: boolean;
    profileLoaded: boolean;
    logout: () => Promise<void>;
    clearSession: () => Promise<void>;
    impersonatingUserId: string | null;
    isImpersonating: boolean;
    resetImpersonation: () => void;
    missingProfileFields: string[];
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isActive, setIsActive] = useState<boolean | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);
    const loadingRef = useRef(true);
    const authReadyRef = useRef(false);
    const profileCacheRef = useRef<{ userId: string; profile: any; timestamp: number } | null>(null);
    const mounted = useRef(true);
    const navigate = useNavigate();
    const lastInitializedUserRef = useRef<string | null>(null);
    const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);

    // Sync loadingRef with loading state
    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    // Sync authReadyRef with authReady state
    useEffect(() => {
        authReadyRef.current = authReady;
    }, [authReady]);

    const getCachedAuth = (): CachedAuth | null => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (err) {
            console.error('Error reading cached auth:', err);
            return null;
        }
    };

    const setCachedAuth = (session: Session | null, userRole: string | null, isActive: boolean | null, profileData: any | null = null) => {
        try {
            if (session && session.user?.id) {
                const payload = { userId: session.user.id, userRole, isActive, profile: profileData };
                localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
            } else {
                localStorage.removeItem(CACHE_KEY);
            }
        } catch (error) {
            console.error('Error caching auth:', error);
        }
    };

    const getProfile = async (userId: string, role?: string | null, retries = 1): Promise<any | null> => {
        if (!userId) {
            console.error('getProfile called without userId');
            return null;
        }

        // CRITICAL: Cache short-circuit - return immediately if cached, do NOT fetch again
        if (profileCacheRef.current && profileCacheRef.current.userId === userId) {
            const cacheAge = Date.now() - profileCacheRef.current.timestamp;
            if (cacheAge < 30000) { // 30 second cache
                console.log('Profile cache HIT for user:', userId, 'role:', role, '- returning cached profile, NOT fetching');
                return profileCacheRef.current.profile; // Return immediately, no fetch
            }
        }

        for (let i = 0; i <= retries; i++) {
            if (!navigator.onLine) {
                console.warn('Network offline, skipping profile fetch');
                return null;
            }

            const controller = new AbortController();
            const timeoutDuration = 10000; // 10 seconds per attempt
            const timeoutId = setTimeout(() => {
                console.warn(`Profile fetch attempt ${i + 1} timing out after ${timeoutDuration}ms for user ${userId}`);
                controller.abort();
            }, timeoutDuration);

            try {
                console.log(`Fetching profile for user ${userId} with role: ${role || 'unknown'} (attempt ${i + 1}/${retries + 1})`);
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
                        // Cache the "not found" result
                        profileCacheRef.current = { userId, profile: null, timestamp: Date.now() };
                        return null;
                    }
                    throw error;
                }

                if (profile) {
                    console.log('Profile fetched successfully:', {
                        userId,
                        role: profile.role,
                        is_active: profile.is_active,
                        branch: profile.branch,
                        full_name: profile.full_name
                    });
                    // Cache the profile
                    profileCacheRef.current = { userId, profile, timestamp: Date.now() };
                    return profile;
                }

                console.warn('Profile query returned no data for user:', userId);
                return null;
            } catch (err: unknown) {
                clearTimeout(timeoutId);
                const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('timeout'));
                const errorMessage = err instanceof Error ? err.message : String(err);

                if (i === retries) {
                    console.error(`Profile fetch failed after ${retries + 1} attempts for user ${userId}:`, errorMessage);
                    // Return null to allow app to continue with defaults/metadata
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
            setAuthReady(false);
            setProfileLoaded(false);
            lastInitializedUserRef.current = null;
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

    const refreshProfile = useCallback(async () => {
        if (!session?.user?.id) return;
        console.log('Refreshing profile for user:', session.user.id);
        profileCacheRef.current = null; // Bust cache
        const fresh = await getProfile(session.user.id, userRole);
        if (fresh && mounted.current) {
            setProfile(fresh);
            setUserRole(fresh.role);
            setIsActive(fresh.is_active);
        }
    }, [session, userRole]);

    const initAuth = useCallback(async () => {
        // GUARD: If auth is already ready for the same user, skip re-processing
        if (authReadyRef.current && lastInitializedUserRef.current) {
            console.log('Auth already initialized for user:', lastInitializedUserRef.current, '- skipping reinit');
            return;
        }

        if (initInProgress.current) {
            console.log('Auth initialization already in progress, skipping');
            return;
        }
        initInProgress.current = true;

        const timeoutId = setTimeout(() => {
            if (loadingRef.current && mounted.current) {
                console.warn('Auth initialization timed out after 30s, forcing loading to false');
                setLoading(false);
            }
        }, 30000);

        try {
            console.log('Initializing auth, verifying session...');

            // RULE 5: getSession must be read-only after auth is established
            if (authReadyRef.current) {
                console.log('Auth already ready, skipping getSession call');
                clearTimeout(timeoutId);
                initInProgress.current = false;
                return;
            }

            let supabaseSession = null;
            let sessionError = null;

            try {
                const { data, error } = await supabase.auth.getSession();
                supabaseSession = data?.session ?? null;
                sessionError = error ?? null;
                console.log('getSession resolved:', { hasSession: !!supabaseSession, hasError: !!sessionError });
            } catch (err) {
                console.error('getSession threw exception:', err);
                sessionError = err;
            }

            if (sessionError) {
                console.error('Supabase getSession error:', sessionError);
                handleClearAuth(false);
                clearTimeout(timeoutId);
                initInProgress.current = false;
                return;
            }

            if (!mounted.current) {
                clearTimeout(timeoutId);
                initInProgress.current = false;
                return;
            }

            if (supabaseSession) {
                console.log('INITIAL_SESSION detected for user:', supabaseSession.user.id);

                if (window.location.pathname === '/reset-password') {
                    console.log('initAuth: Reset password page detected, skipping profile fetch');
                    setSession(supabaseSession);
                    setAuthReady(true);
                    lastInitializedUserRef.current = supabaseSession.user.id;
                    setLoading(false);
                    clearTimeout(timeoutId);
                    initInProgress.current = false;
                    return;
                }

                const cached = getCachedAuth();
                const isCacheValid = cached?.userId === supabaseSession.user.id;

                const roleFromMetadata = supabaseSession.user.user_metadata?.role;
                const roleFromCache = isCacheValid ? cached?.userRole : null;
                const detectedRole = roleFromMetadata || roleFromCache;

                console.log('Session found, loading profile based on role:', {
                    userId: supabaseSession.user.id,
                    detectedRole
                });

                // RULE 4: Decouple profile loading from auth readiness - mark auth ready first
                setSession(supabaseSession);
                setAuthReady(true);
                lastInitializedUserRef.current = supabaseSession.user.id;
                setLoading(false);

                // Load profile asynchronously, don't block auth readiness
                const effectiveId = impersonatingUserId || supabaseSession.user.id;
                const profile = await getProfile(effectiveId, detectedRole);

                if (!mounted.current) {
                    clearTimeout(timeoutId);
                    initInProgress.current = false;
                    return;
                }

                const role = profile?.role || supabaseSession.user.user_metadata?.role || (isCacheValid ? cached?.userRole : null);
                const active = profile?.is_active ?? (isCacheValid ? cached?.isActive : null) ?? (role === 'admin' ? true : null);

                console.log('Auth verification complete:', {
                    userId: supabaseSession.user.id,
                    role,
                    active,
                    profileLoaded: !!profile
                });

                setUserRole(role);
                setIsActive(active);
                setProfile(profile || (isCacheValid ? cached?.profile : null));
                setProfileLoaded(true);

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
        if (session && (userRole === 'admin' || userRole === 'super_admin')) {
            timerRef.current = setTimeout(() => {
                console.log('Inactivity timeout reached, logging out...');
                logout();
            }, inactivityTimeout);
        }
    }, [session, userRole, logout]);

    const impersonating = localStorage.getItem('impersonating_user');
    const isImpersonating = !!impersonatingUserId;
    const effectiveUserId = impersonatingUserId || (session?.user?.id ?? null);

    const resetImpersonation = useCallback(() => {
        localStorage.removeItem('impersonating_user');
        localStorage.removeItem('original_user');
        setImpersonatingUserId(null);
        if (window.location.pathname !== '/user-management') {
            navigate('/user-management', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        const impersonating = localStorage.getItem('impersonating_user');
        if (impersonating) {
            try {
                const data = JSON.parse(impersonating);
                setImpersonatingUserId(data.id);
            } catch (e) {
                console.error('Failed to parse impersonating_user', e);
            }
        }
    }, []);

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const handleActivity = () => resetInactivityTimer();

        if (session && (userRole === 'admin' || userRole === 'super_admin')) {
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

            // RULE 2: Skip SIGNED_IN if already initialized for the same user
            if (event === 'SIGNED_IN' && authReadyRef.current && currentSession?.user?.id === lastInitializedUserRef.current) {
                console.log('SIGNED_IN skipped - auth already initialized for user:', lastInitializedUserRef.current);
                return;
            }

            // Set a timeout to ensure loading is never stuck for too long on auth state changes
            const authStateTimeout = setTimeout(() => {
                if (mounted.current && loadingRef.current) {
                    console.warn('Auth state change handler taking too long, forcing loading to false');
                    setLoading(false);
                }
            }, 20000); // 20 second maximum for auth state change processing

            try {
                if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED' || (event === 'SIGNED_IN' && isResetPasswordRoute)) {
                    console.log(`Auth event ${event} detected during reset/recovery - skipping profile fetch`);
                    setSession(currentSession);
                    setLoading(false);
                    clearTimeout(authStateTimeout);
                    return;
                }

                if (currentSession) {
                    // CRITICAL FIX: Mark auth ready immediately on SIGNED_IN
                    // Login completes NOW, not after profile loads
                    console.log('✅ SIGNED_IN - Auth complete, marking ready immediately');
                    setSession(currentSession);
                    setAuthReady(true);
                    lastInitializedUserRef.current = currentSession.user.id;
                    setLoading(false);
                    clearTimeout(authStateTimeout);

                    // ASYNC: Load profile in background, non-blocking
                    // Profile loading must NOT delay login completion
                    const loadProfileAsync = async () => {
                        try {
                            const cached = getCachedAuth();
                            const isCacheValid = cached?.userId === currentSession.user.id;

                            // Detect role early from multiple sources
                            const roleFromMetadata = currentSession.user.user_metadata?.role;
                            const roleFromCache = isCacheValid ? cached?.userRole : null;
                            const detectedRole = roleFromMetadata || roleFromCache;

                            console.log('Loading profile async in background:', {
                                userId: currentSession.user.id,
                                detectedRole,
                                event
                            });

                            // RULE 3: Enforce profile cache short-circuit
                            const effectiveId = impersonatingUserId || currentSession.user.id;
                            const profile = await getProfile(effectiveId, detectedRole);

                            if (!mounted.current) {
                                console.log('Component unmounted during profile fetch');
                                return;
                            }

                            // Priority: fresh profile > user_metadata > valid cache > defaults
                            const role = profile?.role || currentSession.user.user_metadata?.role || (isCacheValid ? cached?.userRole : null);
                            const active = profile?.is_active ?? (isCacheValid ? cached?.isActive : null) ?? (role === 'admin' ? true : null);

                            console.log('Profile loaded async:', {
                                userId: currentSession.user.id,
                                role,
                                active,
                                profileLoaded: !!profile
                            });

                            // Update state with profile data
                            setUserRole(role);
                            setIsActive(active);
                            setProfile(profile || (isCacheValid ? cached?.profile : null));
                            setProfileLoaded(true);

                            if (role) {
                                setCachedAuth(currentSession, role, active, profile || (isCacheValid ? cached?.profile : null));
                            }
                        } catch (profileError) {
                            console.error('Profile load failed (non-blocking):', profileError);
                            // Do NOT rollback auth - profile failure does not affect login
                            // Use cached data or defaults
                            const cached = getCachedAuth();
                            if (cached) {
                                setUserRole(cached.userRole);
                                setIsActive(cached.isActive);
                                setProfile(cached.profile);
                            }
                        }
                    };

                    // Fire profile load without awaiting
                    loadProfileAsync();

                    // ESCAPE HATCH: If profile takes too long, force completion anyway
                    const profileTimeoutId = setTimeout(() => {
                        if (mounted.current && !profileCacheRef.current) {
                            console.warn('⚠️ Profile timeout (3s) - forcing completion with cached/default data');
                            setProfileLoaded(true);
                            // Auth is already ready, just ensure profile state has fallback
                            const cached = getCachedAuth();
                            if (cached) {
                                setUserRole(cached.userRole);
                                setIsActive(cached.isActive);
                                setProfile(cached.profile);
                            } else {
                                // Use minimal defaults - default is_active to false for safety
                                // so pending users don't inadvertently get navigated to dashboard
                                setUserRole(currentSession.user.user_metadata?.role || null);
                                setIsActive(currentSession.user.user_metadata?.role === 'admin' ? true : false);
                            }
                        }
                    }, 3000);
                } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                    console.log('Auth event:', event, '- clearing session');
                    handleClearAuth(true);
                } else {
                    if (isResetPasswordRoute) {
                        console.log('Ignoring state clear for event:', event, 'on reset-password route');
                        setLoading(false);
                        clearTimeout(authStateTimeout);
                        return;
                    }
                    console.log('Auth event:', event, 'with no session - clearing state');
                    handleClearAuth(false);
                }
            } finally {
                clearTimeout(authStateTimeout);
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

    const missingProfileFields = profile
        ? PROFILE_REQUIRED_FIELDS.filter((f) => !profile[f])
        : [];

    const value = {
        session,
        user: session?.user ?? null,
        userRole,
        isActive,
        profile,
        loading,
        authReady,
        profileLoaded,
        logout,
        clearSession,
        impersonatingUserId,
        isImpersonating,
        resetImpersonation,
        effectiveUserId,
        missingProfileFields,
        refreshProfile,
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