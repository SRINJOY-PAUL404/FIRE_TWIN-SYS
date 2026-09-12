import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, ShieldAlert, Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login failure:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (err.response?.status === 429) {
        setError('Too many failed attempts. Please wait 15 minutes before retrying.');
      } else if (err.response?.status === 403) {
        setError('This administrator account is disabled. Contact system administrator.');
      } else {
        setError('Invalid operator email or password. Please verify credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-command-bg)] px-4">
      <div className="w-full max-w-md p-8 border border-[var(--color-command-border)] bg-[var(--color-command-panel)] shadow-2xl relative overflow-hidden">
        {/* Top Decorative Amber Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-amber-alert)]"></div>

        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[var(--color-command-bg)] border border-[var(--color-command-border)] mb-3">
            <Flame className="w-8 h-8 text-[var(--color-amber-alert)]" />
          </div>
          <h1 className="font-[var(--font-nav)] text-3xl text-gray-100 uppercase tracking-widest font-bold">
            FireTwin <span className="text-[var(--color-amber-alert)]">SYS</span>
          </h1>
          <p className="mt-1 text-xs text-[var(--color-steel-blue)] font-[var(--font-mono)] tracking-wider">
            MULTI-ADMIN AUTHENTICATION GATEWAY
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 border border-[var(--color-red-critical)]/80 bg-red-950/40 text-[var(--color-red-critical)] font-[var(--font-mono)] text-xs flex items-start gap-2.5 animate-fade-in">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs uppercase text-[var(--color-steel-blue)] font-[var(--font-mono)] mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>Operator Email</span>
            </label>
            <input
              type="email"
              required
              disabled={isSubmitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-gray-100 px-3.5 py-2.5 font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)] transition-colors disabled:opacity-50"
              placeholder="admin@firetwin.edu"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-[var(--color-steel-blue)] font-[var(--font-mono)] mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Passcode</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-gray-100 pl-3.5 pr-10 py-2.5 font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)] transition-colors disabled:opacity-50"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-steel-blue)] hover:text-gray-200 transition-colors cursor-pointer"
                title={showPassword ? 'Hide passcode' : 'Show passcode'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[var(--color-amber-alert)] hover:bg-[#d99230] text-[#0F1218] font-bold uppercase tracking-widest font-[var(--font-nav)] text-base transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AUTHENTICATING OPERATOR...</span>
              </>
            ) : (
              <span>VERIFY & ACCESS COMMAND</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-[var(--color-command-border)] pt-4">
          <p className="text-xs text-[var(--color-steel-blue)] font-[var(--font-mono)] mb-2.5">
            Need an operator or technician account?{' '}
            <Link
              to="/register"
              className="text-[var(--color-amber-alert)] hover:underline inline-flex items-center gap-1 font-bold ml-1"
            >
              Enroll Credentials →
            </Link>
          </p>
          <p className="text-[11px] text-[var(--color-steel-blue)] font-[var(--font-mono)]">
            SECURE CAMPUS DIGITAL TWIN MONITORING SYSTEM
          </p>
          <p className="text-[10px] text-slate-500 font-[var(--font-mono)] mt-1">
            Brainware University — Barasat Campus
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
