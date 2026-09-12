import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft, Flame, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AccessDenied: React.FC = () => {
  const { user } = useAuth();

  const roleDisplay =
    user?.role === 'super_admin' || user?.role === 'CMD_ADMIN'
      ? 'Super Admin'
      : user?.role === 'admin'
      ? 'Safety Officer'
      : user?.role === 'technician'
      ? 'Technician'
      : user?.role === 'viewer'
      ? 'Observer'
      : user?.role || 'Unknown';

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6">
      <div className="relative max-w-md w-full">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-red-900/30 via-red-600/20 to-red-900/30 blur-xl opacity-60" />

        <div className="relative bg-[var(--color-command-panel)] border border-red-800/60 p-8 text-center">
          {/* Header icon cluster */}
          <div className="flex items-center justify-center mb-5">
            <div className="relative">
              <div className="w-16 h-16 bg-red-950/50 border border-red-800/50 flex items-center justify-center">
                <ShieldOff className="w-8 h-8 text-red-500" />
              </div>
              <Lock className="w-5 h-5 text-red-400 absolute -top-2 -right-2" />
            </div>
          </div>

          {/* Status code */}
          <div className="font-[var(--font-mono)] text-red-500/80 text-xs tracking-widest mb-2">
            ▸ ERR::403 — ACCESS_VIOLATION
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold tracking-widest text-[#E2E8F0] uppercase font-[var(--font-nav)] mb-3">
            Clearance Required
          </h1>

          {/* Description */}
          <p className="text-sm text-[var(--color-steel-blue)] font-[var(--font-mono)] leading-relaxed mb-4">
            Your current clearance level does not authorize access to this module.
          </p>

          {/* Role badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-command-bg)] border border-[var(--color-command-border)] mb-6">
            <Flame className="w-3.5 h-3.5 text-[var(--color-amber-alert)]" />
            <span className="text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)]">
              ACTIVE ROLE: <span className="text-[#E2E8F0] font-bold uppercase">{roleDisplay}</span>
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--color-command-border)] mb-6" />

          {/* Action */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-sm font-[var(--font-nav)] tracking-wider uppercase text-[#E2E8F0] hover:bg-[var(--color-amber-alert)]/10 hover:border-[var(--color-amber-alert)]/50 hover:text-[var(--color-amber-alert)] transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>

          {/* Footer note */}
          <p className="text-[10px] text-[var(--color-steel-blue)]/60 font-[var(--font-mono)] mt-5">
            Contact a Super Admin to request elevated permissions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
