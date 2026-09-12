import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Palette, 
  Shield, 
  Building2, 
  Users, 
  Wrench, 
  Wifi, 
  Key, 
  Download,
  ShieldCheck 
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { ProfileTab } from './settings/ProfileTab';
import { PreferencesTab } from './settings/PreferencesTab';
import { AlertRoutingTab } from './settings/AlertRoutingTab';
import { SecurityTab } from './settings/SecurityTab';
import { BuildingsTab } from './settings/BuildingsTab';
import { UsersTab } from './settings/UsersTab';
import { AdminUsersTab } from './settings/AdminUsersTab';
import { MaintenanceTab } from './settings/MaintenanceTab';
import { IoTTab } from './settings/IoTTab';
import { ApiKeysTab } from './settings/ApiKeysTab';
import { ExportTab } from './settings/ExportTab';
import { SETTINGS_TAB_ACCESS, hasAccess } from '../rbac';
import type { AppRole } from '../rbac';

interface CategoryItem {
  id: string;
  label: string;
  icon: any;
  component: React.ComponentType<any>;
  title: string;
  allowedRoles?: AppRole[];
}

const ALL_CATEGORIES: CategoryItem[] = [
  { id: 'profile', label: 'Profile', icon: User, component: ProfileTab, title: 'OPERATOR PROFILE', allowedRoles: SETTINGS_TAB_ACCESS.profile },
  { id: 'admins', label: 'Admin Users', icon: ShieldCheck, component: AdminUsersTab, title: 'MULTI-ADMIN ACCESS MANAGEMENT', allowedRoles: SETTINGS_TAB_ACCESS.admins },
  { id: 'preferences', label: 'Preferences', icon: Palette, component: PreferencesTab, title: 'SYS PREFERENCES', allowedRoles: SETTINGS_TAB_ACCESS.preferences },
  { id: 'alert_routing', label: 'Alert Routing', icon: Bell, component: AlertRoutingTab, title: 'ALERT ROUTING CONFIG', allowedRoles: SETTINGS_TAB_ACCESS.alert_routing },
  { id: 'security', label: 'Security', icon: Shield, component: SecurityTab, title: 'SECURITY PROTOCOLS', allowedRoles: SETTINGS_TAB_ACCESS.security },
  { id: 'buildings', label: 'Buildings', icon: Building2, component: BuildingsTab, title: 'CAMPUS BUILDINGS', allowedRoles: SETTINGS_TAB_ACCESS.buildings },
  { id: 'users', label: 'Technicians', icon: Users, component: UsersTab, title: 'FIELD STAFF MANAGEMENT', allowedRoles: SETTINGS_TAB_ACCESS.users },
  { id: 'maintenance', label: 'Maintenance Rules', icon: Wrench, component: MaintenanceTab, title: 'MAINTENANCE THRESHOLDS', allowedRoles: SETTINGS_TAB_ACCESS.maintenance },
  { id: 'iot', label: 'IoT & MQTT', icon: Wifi, component: IoTTab, title: 'SENSOR CONNECTIVITY', allowedRoles: SETTINGS_TAB_ACCESS.iot },
  { id: 'api_keys', label: 'API Keys', icon: Key, component: ApiKeysTab, title: 'EXTERNAL INTEGRATIONS', allowedRoles: SETTINGS_TAB_ACCESS.api_keys },
  { id: 'export', label: 'Data & Export', icon: Download, component: ExportTab, title: 'DATA MANAGEMENT', allowedRoles: SETTINGS_TAB_ACCESS.export },
];

const Settings = () => {
  const { user, isSuperAdmin } = useAuth();
  const [activeTabId, setActiveTabId] = useState('profile');

  // Filter categories based on RBAC role config
  const visibleCategories = ALL_CATEGORIES.filter(c => {
    if (!c.allowedRoles) return true;
    return hasAccess(user?.role, c.allowedRoles);
  });

  // Safety fallback if active tab is restricted
  const activeCategory = visibleCategories.find(c => c.id === activeTabId) || visibleCategories[0];
  const ActiveComponent = activeCategory.component;

  return (
    <div className="h-full flex flex-col space-y-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-[var(--color-command-panel)] border border-[var(--color-command-border)] px-4 py-2">
        <h1 className="text-lg font-bold tracking-widest uppercase font-[var(--font-nav)] text-[#E2E8F0]">
          System Configuration
        </h1>
        {isSuperAdmin && (
          <span className="text-[10px] font-bold font-[var(--font-mono)] px-2 py-0.5 bg-[var(--color-amber-alert)]/20 text-[var(--color-amber-alert)] border border-[var(--color-amber-alert)]/40">
            SUPER ADMIN ACCESS ENABLED
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 h-full overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-[var(--color-command-panel)] border border-[var(--color-command-border)] flex flex-col overflow-y-auto">
          <div className="px-4 py-2 border-b border-[var(--color-command-border)] font-[var(--font-nav)] text-xs tracking-widest uppercase text-[var(--color-steel-blue)] sticky top-0 bg-[var(--color-command-panel)] z-10">
            Categories
          </div>
          {visibleCategories.map(category => {
            const Icon = category.icon;
            const isActive = activeCategory.id === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveTabId(category.id)}
                className={`flex items-center px-4 py-3 text-sm font-[var(--font-nav)] uppercase tracking-wider transition-colors border-l-2 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-command-bg)] text-[#E2E8F0] border-[var(--color-amber-alert)] font-semibold'
                    : 'text-[var(--color-steel-blue)] hover:bg-[var(--color-command-bg)] hover:text-[#E2E8F0] border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 mr-3 shrink-0 ${category.allowedRoles && category.allowedRoles.length <= 2 ? 'text-[var(--color-amber-alert)]' : ''}`} />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-[var(--color-command-panel)] border border-[var(--color-command-border)] flex flex-col min-w-0">
          <div className="px-6 py-3 border-b border-[var(--color-command-border)] bg-[var(--color-command-bg)] flex justify-between items-center shrink-0">
            <h2 className="text-sm font-[var(--font-nav)] uppercase tracking-widest text-[var(--color-steel-blue)]">
              {activeCategory.title}
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
