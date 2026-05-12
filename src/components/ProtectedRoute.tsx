import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ImpersonationBanner } from './ImpersonationBanner';
import ProfileCompletionDialog from './ProfileCompletionDialog';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { session, userRole, isActive, loading, authReady, profileLoaded, missingProfileFields } = useAuth();

  // Debug log for authorization
  console.log('AUTHZ CHECK', {
    authReady,
    loading,
    profileLoaded,
    userExists: !!session,
    userRole,
    isActive,
    allowedRoles,
    roleMatch: userRole && allowedRoles.includes(userRole)
  });

  // Wait for auth to be ready before checking permissions
  // CRITICAL: Also wait for profileLoaded to ensure userRole is populated from async fetch
  if (loading || !authReady || !profileLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Check if user is deactivated
  if (isActive === false) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check if user has required role
  // Now safe to check because profileLoaded ensures userRole is set
  if (!userRole || !allowedRoles.includes(userRole)) {
    console.warn('Access denied - User role:', userRole, 'Allowed roles:', allowedRoles);
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <>
      <ImpersonationBanner />
      <Outlet />
      {profileLoaded && missingProfileFields.length > 0 && userRole !== 'vendor' && <ProfileCompletionDialog />}
    </>
  );
};