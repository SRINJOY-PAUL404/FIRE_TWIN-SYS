import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, ShieldAlert, Loader2, Lock, Mail, User, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'technician' | 'admin' | 'viewer'>('technician');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passcodes do not match. Please verify and retry.');
      return;
    }

    if (password.length < 6) {
      setError('Passcode must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(name, email, password, role);
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Registration failure:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (err.response?.status === 400) {
        setError('Invalid registration data or email already exists.');
      } else {
        setError('Registration failed. Please contact the system administrator.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-command-bg)] px-4 py-8">
      <div className="w-full max-w-lg p-8 border border-[var(--color-command-border)] bg-[var(--color-command-panel)] shadow-2xl relative overflow-hidden">
        {/* Top Decorative Amber Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-amber-alert)]"></div>

        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[var(--color-command-bg)] border border-[var(--color-command-border)] mb-3">
            <Flame className="w-8 h-8 text-[var(--color-amber-alert)]" />
          </div>
          <h1 className="font-[var(--font-nav)] text-3xl text-gray-100 uppercase tracking-widest font-bold">
            FireTwin <span className="text-[var(--color-amber-alert)]">SYS</span>
          </h1>
          <p className="mt-1 text-xs text-[var(--color-steel-blue)] font-[var(--font-mono)] tracking-wider">
            OPERATOR CREDENTIAL ENROLLMENT
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 border border-[var(--color-red-critical)]/80 bg-red-950/40 text-[var(--color-red-critical)] font-[var(--font-mono)] text-xs flex items-start gap-2.5 animate-fade-in">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-[var(--color-steel-blue)] font-[var(--font-mono)] mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Full Name / Call Sign</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-gray-100 px-3.5 py-2 font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)] transition-colors disabled:opacity-50"
              placeholder="Lt. Alex Miller"
            />
          </div>

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
              className="w-full bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-gray-100 px-3.5 py-2 font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)] transition-colors disabled:opacity-50"
              placeholder="operator@firetwin.edu"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-[var(--color-steel-blue)] font-[var(--font-mono)] mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Operational Role Assignment</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('technician')}
                className={`p-2.5 text-left border transition-colors cursor-pointer font-[var(--font-mono)] text-xs flex flex-col justify-between ${
                  role === 'technician'
                    ? 'border-[var(--color-amber-alert)] bg-[var(--color-amber-alert)]/10 text-gray-100'
                    : 'border-[var(--color-command-border)] bg-[var(--color-command-bg)] text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="font-bold text-gray-200">Technician</span>
                <span className="text-[10px] text-[var(--color-steel-blue)] mt-1">Field Orders & Inspections</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-2.5 text-left border transition-colors cursor-pointer font-[var(--font-mono)] text-xs flex flex-col justify-between ${
                  role === 'admin'
                    ? 'border-[var(--color-amber-alert)] bg-[var(--color-amber-alert)]/10 text-gray-100'
                    : 'border-[var(--color-command-border)] bg-[var(--color-command-bg)] text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="font-bold text-gray-200">Safety Officer</span>
                <span className="text-[10px] text-[var(--color-steel-blue)] mt-1">Telemetry & Alert Triage</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('viewer')}
                className={`p-2.5 text-left border transition-colors cursor-pointer font-[var(--font-mono)] text-xs flex flex-col justify-between ${
                  role === 'viewer'
                    ? 'border-[var(--color-amber-alert)] bg-[var(--color-amber-alert)]/10 text-gray-100'
                    : 'border-[var(--color-command-border)] bg-[var(--color-command-bg)] text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="font-bold text-gray-200">Observer</span>
                <span className="text-[10px] text-[var(--color-steel-blue)] mt-1">Read-Only Map & Dash</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="w-full bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-gray-100 pl-3.5 pr-10 py-2 font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)] transition-colors disabled:opacity-50"
                  placeholder="••••••••"
                  autoComplete="new-password"
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

            <div>
              <label className="block text-xs uppercase text-[var(--color-steel-blue)] font-[var(--font-mono)] mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm Passcode</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-gray-100 pl-3.5 pr-10 py-2 font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)] transition-colors disabled:opacity-50"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-steel-blue)] hover:text-gray-200 transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[var(--color-amber-alert)] hover:bg-[#d99230] text-[#0F1218] font-bold uppercase tracking-widest font-[var(--font-nav)] text-base transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ENROLLING OPERATOR...</span>
              </>
            ) : (
              <span>ENROLL & ENTER COMMAND</span>
            )}
          </button>
        </form>

        {/* Back to Login link */}
        <div className="mt-6 text-center border-t border-[var(--color-command-border)] pt-4">
          <p className="text-xs text-[var(--color-steel-blue)] font-[var(--font-mono)]">
            Already have an operator account?{' '}
            <Link
              to="/login"
              className="text-[var(--color-amber-alert)] hover:underline inline-flex items-center gap-1 font-bold ml-1"
            >
              <ArrowLeft className="w-3 h-3" /> Verify & Access Command
            </Link>
          </p>
          <p className="text-[10px] text-slate-500 font-[var(--font-mono)] mt-2">
            Brainware University — Barasat Campus
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
