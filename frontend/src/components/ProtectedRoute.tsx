import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Flame } from 'lucide-react';
import { hasAccess } from '../rbac';
import type { AppRole } from '../rbac';
import AccessDenied from '../pages/AccessDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-command-bg)]">
        <div className="flex flex-col items-center p-8 bg-[var(--color-command-panel)] border border-[var(--color-command-border)] shadow-2xl max-w-sm text-center">
          <div className="relative mb-4">
            <Flame className="w-10 h-10 text-[var(--color-amber-alert)] animate-pulse" />
            <ShieldCheck className="w-5 h-5 text-cyan-400 absolute -bottom-1 -right-1" />
          </div>
          <h2 className="text-sm font-bold tracking-widest text-[#E2E8F0] uppercase font-[var(--font-nav)] mb-1">
            FIRETWIN SYS SECURITY GATEWAY
          </h2>
          <p className="text-xs text-[var(--color-steel-blue)] font-[var(--font-mono)] animate-pulse">
            VERIFYING OPERATOR CREDENTIALS...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access check
  if (allowedRoles && !hasAccess(user.role, allowedRoles)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
