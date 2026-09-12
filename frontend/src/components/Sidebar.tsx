import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Flame, 
  Bell, 
  Wrench,
  Settings,
  LogOut
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { SIDEBAR_ACCESS, hasAccess } from '../rbac';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isSuperAdmin } = useAuth();
  
  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Campus Map', path: '/map', icon: Map },
    { name: 'Extinguishers', path: '/extinguishers', icon: Flame },
    { name: 'Alerts', path: '/alerts', icon: Bell },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => {
    const allowedRoles = SIDEBAR_ACCESS[item.path];
    if (!allowedRoles) return true;
    return hasAccess(user?.role, allowedRoles);
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'AD';
  };

  const initials = getInitials(user?.name, user?.email);
  const roleDisplay = isSuperAdmin
    ? 'Super Admin'
    : user?.role === 'admin'
    ? 'Campus Admin'
    : user?.role === 'technician'
    ? 'Technician'
    : user?.role === 'viewer'
    ? 'Observer'
    : (user?.role || 'Operator');

  const adminIdDisplay = user?.id ? `ID: #${String(user.id).padStart(4, '0')}` : 'ID: #0001';

  return (
    <aside className="w-64 bg-[var(--color-command-panel)] border-r border-[var(--color-command-border)] h-screen flex flex-col z-10 select-none">
      <div className="h-14 flex items-center px-6 border-b border-[var(--color-command-border)]">
        <Flame className="text-[var(--color-amber-alert)] w-5 h-5 mr-3" />
        <span className="text-lg font-bold tracking-widest text-[#E2E8F0] uppercase font-[var(--font-nav)]">
          FireTwin
        </span>
        <span className="text-lg font-normal text-[var(--color-steel-blue)] ml-1 uppercase font-[var(--font-nav)]">
          Sys
        </span>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={clsx(
                'group flex items-center px-4 py-2 text-sm uppercase tracking-wider font-[var(--font-nav)] transition-colors',
                isActive 
                  ? 'bg-[var(--color-command-bg)] text-[var(--color-amber-alert)] border-l-2 border-[var(--color-amber-alert)] font-semibold' 
                  : 'text-[var(--color-steel-blue)] hover:bg-[var(--color-command-bg)] hover:text-[#E2E8F0] border-l-2 border-transparent'
              )}
            >
              <Icon className={clsx('w-4 h-4 mr-3', isActive ? 'text-[var(--color-amber-alert)]' : 'text-[var(--color-steel-blue)]')} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      {/* Dynamic Logged-in Admin Footer */}
      <div className="p-3.5 border-t border-[var(--color-command-border)] bg-[var(--color-command-panel)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <div className="w-8 h-8 bg-[var(--color-command-bg)] flex-shrink-0 flex items-center justify-center text-[var(--color-amber-alert)] font-[var(--font-mono)] text-xs font-bold border border-[var(--color-command-border)]">
              {initials}
            </div>
            <div className="ml-2.5 truncate">
              <p className="text-xs font-bold tracking-wider text-[#E2E8F0] uppercase font-[var(--font-nav)] truncate" title={user?.name || user?.email}>
                {user?.name || user?.email || 'Administrator'}
              </p>
              <p className="text-[10px] text-[var(--color-steel-blue)] font-[var(--font-mono)] truncate">
                {roleDisplay} • {adminIdDisplay}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-[var(--color-steel-blue)] hover:text-[var(--color-red-critical)] transition-colors ml-1"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
