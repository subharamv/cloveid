import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { gsap } from 'gsap';
import RoleSelectionDialog from '@/components/RoleSelectionDialog';
import LandingPanel from '@/components/auth/LandingPanel';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { session, userRole, isActive, loading, logout } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [isForgotView, setIsForgotView] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [isAuthStuck, setIsAuthStuck] = useState(false);

  const rightPanelRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const authStuckRef = useRef<HTMLDivElement>(null);

  const clearSiteData = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    window.location.reload();
  };

  useEffect(() => {
    let stuckTimeout: NodeJS.Timeout;
    if (session && !userRole && !loading) {
      stuckTimeout = setTimeout(() => setIsAuthStuck(true), 5000);
    } else {
      setIsAuthStuck(false);
    }
    return () => clearTimeout(stuckTimeout);
  }, [session, userRole, loading]);

  useEffect(() => {
    if (!loading && session) {
      const role = userRole || session.user.user_metadata?.role;
      if (!role) return;
      if (isActive === false) return;
      if (role === 'admin' || role === 'manager') {
        setShowRoleDialog(true);
      } else if (role === 'vendor') {
        navigate('/vendor-dashboard', { replace: true });
      } else {
        navigate('/user-dashboard', { replace: true });
      }
    }
  }, [session, userRole, isActive, loading, navigate]);

  // GSAP right panel entrance
  useEffect(() => {
    gsap.fromTo(
      rightPanelRef.current,
      { opacity: 0, x: 60 },
      { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }
    );
  }, []);

  const animateFormSwitch = (cb: () => void) => {
    gsap.to(formContainerRef.current, {
      opacity: 0,
      y: 10,
      duration: 0.12,
      onComplete: () => {
        cb();
        gsap.fromTo(formContainerRef.current, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.2 });
      },
    });
  };

  const switchToLogin = () => {
    if (isLoginView && !isForgotView) return;
    animateFormSwitch(() => { setIsLoginView(true); setIsForgotView(false); });
  };

  const switchToRegister = () => {
    if (!isLoginView && !isForgotView) return;
    animateFormSwitch(() => { setIsLoginView(false); setIsForgotView(false); });
  };

  const switchToForgot = () => {
    animateFormSwitch(() => { setIsForgotView(true); });
  };

  const switchFromForgot = () => {
    animateFormSwitch(() => { setIsForgotView(false); });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-[#617289] dark:text-gray-400 text-sm animate-pulse">Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden">
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
              {/* Left Side - v2.0 Landing Panel */}
              <LandingPanel />

              {/* Right Side - Auth Forms */}
              <div
                ref={rightPanelRef}
                className="flex flex-col justify-center bg-white dark:bg-zinc-900/50 p-6 md:p-10"
              >
                <div className="w-full max-w-md mx-auto">
                  {/* Toggle */}
                  {!isForgotView && (
                    <div ref={toggleRef} className="flex px-4 py-3">
                      <div className="flex h-10 flex-1 rounded-lg bg-background-light dark:bg-background-dark p-1">
                        <button
                          onClick={switchToLogin}
                          className={`flex-1 h-full rounded-lg text-sm font-medium leading-normal transition-all duration-200 ${
                            isLoginView
                              ? 'bg-white dark:bg-zinc-700 shadow-[0_0_4px_rgba(0,0,0,0.1)] text-[#111418] dark:text-white'
                              : 'text-[#617289] dark:text-gray-400 hover:text-[#111418] dark:hover:text-white'
                          }`}
                        >
                          Login
                        </button>
                        <button
                          onClick={switchToRegister}
                          className={`flex-1 h-full rounded-lg text-sm font-medium leading-normal transition-all duration-200 ${
                            !isLoginView
                              ? 'bg-white dark:bg-zinc-700 shadow-[0_0_4px_rgba(0,0,0,0.1)] text-[#111418] dark:text-white'
                              : 'text-[#617289] dark:text-gray-400 hover:text-[#111418] dark:hover:text-white'
                          }`}
                        >
                          Register
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Form Container */}
                  <div ref={formContainerRef}>
                    {isForgotView ? (
                      <ForgotPasswordForm onBack={switchFromForgot} />
                    ) : isLoginView ? (
                      <LoginForm onForgotPassword={switchToForgot} onSuccess={() => {}} />
                    ) : (
                      <RegisterForm />
                    )}
                  </div>

                  {/* Auth Stuck Warning */}
                  {isAuthStuck && (
                    <div ref={authStuckRef} className="mx-4 my-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-400 mb-2">
                        Authentication is taking longer than expected.
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => logout()}
                          className="text-sm font-bold text-amber-900 dark:text-amber-300 underline hover:no-underline text-left"
                        >
                          Sign out and try again
                        </button>
                        <button
                          onClick={clearSiteData}
                          className="text-sm font-bold text-red-600 dark:text-red-400 underline hover:no-underline text-left"
                        >
                          Hard Reset (Clear Cache & Reload)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dev Reset */}
                  <div className="mt-4 text-center border-t border-gray-100 dark:border-zinc-800 pt-4">
                    <button
                      onClick={clearSiteData}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Trouble logging in? Reset Site Data & Cache
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="mt-6 text-center space-y-1">
                    <p className="text-xs text-[#617289]/60 dark:text-gray-500/60">
                      Clove Technologies Private Limited &middot; All Rights Reserved
                    </p>
                    <p className="text-xs text-[#617289]/60 dark:text-gray-500/60">
                      Developed by{' '}
                      <a
                        href="https://in.linkedin.com/in/yuva-subharam-vasamsetti-75a39117a"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                      >
                        Yuva Subharam Vasamsetti
                      </a>
                    </p>
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
