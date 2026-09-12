import React, { useState, useEffect } from 'react';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '../../api';
import type { AdminUser } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  UserPlus, 
  Shield, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  RefreshCw,
  Power
} from 'lucide-react';

export const AdminUsersTab: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New admin form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'super_admin' | 'admin'>('admin');

  const fetchAdminsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdmins();
      setAdmins(data);
    } catch (err: any) {
      console.error('Failed to load admins:', err);
      setError(err.response?.data?.detail || 'Failed to load administrator accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminsList();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    try {
      setActionLoading('create');
      setError(null);
      setSuccessMsg(null);

      const created = await createAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role,
        status: 'active',
      });

      setAdmins(prev => [...prev, created]);
      setSuccessMsg(`Administrator account '${created.email}' provisioned successfully.`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('admin');
    } catch (err: any) {
      console.error('Create admin error:', err);
      setError(err.response?.data?.detail || 'Failed to provision administrator account.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    if (admin.id === currentUser?.id) {
      setError('Cannot disable your own active administrator account.');
      return;
    }

    const newStatus = admin.status === 'active' ? 'disabled' : 'active';
    try {
      setActionLoading(`status-${admin.id}`);
      setError(null);
      const updated = await updateAdmin(admin.id, { status: newStatus });
      setAdmins(prev => prev.map(a => a.id === admin.id ? updated : a));
      setSuccessMsg(`Account '${admin.email}' status set to ${newStatus.toUpperCase()}.`);
    } catch (err: any) {
      console.error('Update status error:', err);
      setError(err.response?.data?.detail || 'Failed to update account status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (admin: AdminUser, newRole: string) => {
    if (admin.role === newRole) return;
    try {
      setActionLoading(`role-${admin.id}`);
      setError(null);
      const updated = await updateAdmin(admin.id, { role: newRole });
      setAdmins(prev => prev.map(a => a.id === admin.id ? updated : a));
      setSuccessMsg(`Account '${admin.email}' role updated to ${newRole.toUpperCase()}.`);
    } catch (err: any) {
      console.error('Update role error:', err);
      setError(err.response?.data?.detail || 'Failed to update administrator role.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (admin.id === currentUser?.id) {
      setError('Cannot delete your own active administrator account.');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to permanently remove administrator '${admin.name} (${admin.email})'?`);
    if (!confirmDelete) return;

    try {
      setActionLoading(`delete-${admin.id}`);
      setError(null);
      await deleteAdmin(admin.id);
      setAdmins(prev => prev.filter(a => a.id !== admin.id));
      setSuccessMsg(`Administrator account '${admin.email}' removed successfully.`);
    } catch (err: any) {
      console.error('Delete admin error:', err);
      setError(err.response?.data?.detail || 'Failed to delete administrator account.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Alert Notices */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-[var(--color-red-critical)] text-[var(--color-red-critical)] font-[var(--font-mono)] text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white text-xs font-bold px-1">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/60 text-emerald-400 font-[var(--font-mono)] text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white text-xs font-bold px-1">✕</button>
        </div>
      )}

      {/* Provision New Admin Card */}
      <div className="bg-[#0F1218] p-5 border border-[var(--color-command-border)] space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-command-border)] pb-2.5">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-[var(--color-amber-alert)]" />
            <h3 className="text-xs font-bold font-[var(--font-nav)] uppercase tracking-widest text-[#E2E8F0]">
              PROVISION ADMINISTRATOR ACCOUNT
            </h3>
          </div>
          <span className="text-[10px] font-[var(--font-mono)] text-[var(--color-steel-blue)]">
            SUPER ADMIN AUTHORIZED
          </span>
        </div>

        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Safety Inspector"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-command-border)] bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-xs focus:outline-none focus:border-[var(--color-amber-alert)]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="admin@firetwin.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-command-border)] bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-xs focus:outline-none focus:border-[var(--color-amber-alert)]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">
                Temporary Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-command-border)] bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-xs focus:outline-none focus:border-[var(--color-amber-alert)]"
                />
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">
                Security Role
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'super_admin' | 'admin')}
                className="w-full px-3 py-2 border border-[var(--color-command-border)] bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-xs focus:outline-none focus:border-[var(--color-amber-alert)]"
              >
                <option value="admin">ADMIN (Operations & Monitoring)</option>
                <option value="super_admin">SUPER ADMIN (Full System Control)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={actionLoading === 'create' || !name.trim() || !email.trim() || !password.trim()}
              className="px-4 py-2 bg-[var(--color-amber-alert)] hover:bg-[#d99230] text-[#0F1218] font-[var(--font-nav)] font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{actionLoading === 'create' ? 'PROVISIONING...' : 'PROVISION ADMIN'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Admin Users Table */}
      <div className="border border-[var(--color-command-border)] bg-[#0F1218]">
        <div className="p-3.5 border-b border-[var(--color-command-border)] bg-[var(--color-command-panel)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold font-[var(--font-nav)] uppercase tracking-wider text-[#E2E8F0]">
              REGISTERED ADMINISTRATOR POOL ({admins.length})
            </h4>
          </div>
          <button
            onClick={fetchAdminsList}
            className="text-[var(--color-steel-blue)] hover:text-white p-1 flex items-center gap-1 text-[11px] font-[var(--font-mono)]"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-command-bg)] border-b border-[var(--color-command-border)] font-[var(--font-nav)] text-[11px] uppercase tracking-wider text-[var(--color-steel-blue)]">
                <th className="p-3">ID</th>
                <th className="p-3">Admin Name / Email</th>
                <th className="p-3">Role Tier</th>
                <th className="p-3">Account Status</th>
                <th className="p-3 hidden md:table-cell">Created</th>
                <th className="p-3 hidden lg:table-cell">Last Login</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-[var(--font-mono)] text-xs divide-y divide-[var(--color-command-border)]">
              {admins.map(admin => {
                const isSelf = admin.id === currentUser?.id;
                const isSuper = admin.role === 'super_admin' || admin.role === 'CMD_ADMIN';
                const isActive = admin.status === 'active';

                return (
                  <tr
                    key={admin.id}
                    className={`hover:bg-[var(--color-command-panel)] transition-colors ${
                      !isActive ? 'opacity-50 bg-red-950/10' : ''
                    } ${isSelf ? 'bg-[var(--color-command-panel)]/40' : ''}`}
                  >
                    <td className="p-3 text-[var(--color-steel-blue)]">#{String(admin.id).padStart(4, '0')}</td>
                    <td className="p-3">
                      <div className="font-bold text-[#E2E8F0] flex items-center gap-1.5">
                        <span>{admin.name}</span>
                        {isSelf && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-[var(--color-amber-alert)]/20 text-[var(--color-amber-alert)] border border-[var(--color-amber-alert)]/40 font-bold uppercase">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--color-steel-blue)]">{admin.email}</div>
                    </td>
                    <td className="p-3">
                      <select
                        value={isSuper ? 'super_admin' : 'admin'}
                        disabled={isSelf || actionLoading === `role-${admin.id}`}
                        onChange={e => handleRoleChange(admin, e.target.value)}
                        className={`text-[10px] font-bold font-[var(--font-mono)] px-2 py-1 uppercase border focus:outline-none cursor-pointer disabled:cursor-not-allowed ${
                          isSuper
                            ? 'bg-amber-950/30 text-[var(--color-amber-alert)] border-[var(--color-amber-alert)]/60'
                            : 'bg-cyan-950/30 text-cyan-400 border-cyan-500/60'
                        }`}
                      >
                        <option value="super_admin">SUPER ADMIN</option>
                        <option value="admin">ADMIN</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase border ${
                          isActive
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50'
                            : 'bg-red-950/40 text-[var(--color-red-critical)] border-red-500/50'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-400 hidden md:table-cell">
                      {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'Initial Setup'}
                    </td>
                    <td className="p-3 text-[11px] text-slate-400 hidden lg:table-cell">
                      {admin.last_login_at ? new Date(admin.last_login_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Status Toggle Button */}
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          disabled={isSelf || actionLoading === `status-${admin.id}`}
                          title={isSelf ? 'Cannot disable self' : isActive ? 'Disable Account' : 'Enable Account'}
                          className={`p-1.5 border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            isActive
                              ? 'text-amber-400 border-[var(--color-command-border)] hover:border-amber-400'
                              : 'text-emerald-400 border-emerald-500/40 hover:border-emerald-400'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Admin Button */}
                        <button
                          onClick={() => handleDeleteAdmin(admin)}
                          disabled={isSelf || actionLoading === `delete-${admin.id}`}
                          title={isSelf ? 'Cannot delete self' : 'Permanently Delete Admin'}
                          className="p-1.5 text-slate-500 hover:text-[var(--color-red-critical)] border border-[var(--color-command-border)] hover:border-[var(--color-red-critical)]/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
