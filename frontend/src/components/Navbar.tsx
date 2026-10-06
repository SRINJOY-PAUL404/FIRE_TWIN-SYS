import React from 'react';
import { Search, Bell, Activity, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();

  const roleLabel = isSuperAdmin
    ? 'SUPER ADMIN'
    : user?.role === 'admin'
    ? 'ADMIN'
    : (user?.role?.toUpperCase() || 'OPERATOR');

  return (
    <header className="h-14 bg-[var(--color-command-panel)] border-b border-[var(--color-command-border)] flex items-center justify-between px-6 z-10 relative">
      {/* Global Search */}
      <div className="flex-1 max-w-lg">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[var(--color-steel-blue)]" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-1.5 border border-[var(--color-command-border)] rounded-none leading-5 bg-[var(--color-command-bg)] text-[#E2E8F0] placeholder-[var(--color-steel-blue)] focus:outline-none focus:border-[var(--color-amber-alert)] sm:text-sm font-[var(--font-body)]"
            placeholder="Search ID, Location..."
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-5 ml-6">
        {/* Connection Status */}
        <div className="flex items-center space-x-2 font-[var(--font-mono)] text-xs">
          <span className="text-[var(--color-steel-blue)] hidden sm:inline">SYS_CONN:</span>
            <span className="text-[var(--color-success-teal)] flex items-center">
              <Activity className="w-3 h-3 mr-1" /> LIVE
            </span>
        </div>

        {/* Admin Badge & Name */}
        <div className="flex items-center space-x-2 border-l border-[var(--color-command-border)] pl-4">
          <div className="text-right">
            <div className="font-[var(--font-nav)] text-xs tracking-widest text-[#E2E8F0] uppercase font-bold flex items-center gap-1">
              <Shield className={`w-3.5 h-3.5 ${isSuperAdmin ? 'text-[var(--color-amber-alert)]' : 'text-cyan-400'}`} />
              <span>{roleLabel}</span>
            </div>
            <p className="text-[10px] text-[var(--color-steel-blue)] font-[var(--font-mono)] truncate max-w-[140px]">
              {user?.name || user?.email || 'Administrator'}
            </p>
          </div>
        </div>

        <button className="p-1 relative text-[var(--color-steel-blue)] hover:text-[#E2E8F0]" title="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-0 right-0 block h-1.5 w-1.5 rounded-none bg-[var(--color-amber-alert)]"></span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
