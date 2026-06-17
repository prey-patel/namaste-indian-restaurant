'use client';

import { useLocale } from 'next-intl';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, ShieldAlert, Sparkles, X } from 'lucide-react';
import { createUserAction, updateUserAction } from '@/app/admin/users/actions';
import StatusPill from '@/components/ui/status-pill';

interface User {
  id: string;
  email: string;
  role: 'owner' | 'manager' | 'kitchen' | 'staff';
  full_name: string;
  phone: string | null;
  is_active: boolean;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null; // null means "Add New User"
  callerRole: 'owner' | 'manager';
  isActiveOwnerLast: boolean;
}

export default function UserModal({
  isOpen,
  onClose,
  user,
  callerRole,
  isActiveOwnerLast,
}: UserModalProps) {
  const locale = useLocale();
  const isEdit = !!user;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'owner' | 'manager' | 'kitchen' | 'staff'>('staff');
  const [isActive, setIsActive] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  // Initialize fields on open/user change
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCreatedPassword(null);
      setShowPassword(false);

      if (user) {
        setFullName(user.full_name || '');
        setEmail(user.email || '');
        setPassword('');
        setPhone(user.phone || '');
        setRole(user.role || 'staff');
        setIsActive(user.is_active ?? false);
      } else {
        setFullName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setRole('staff');
        setIsActive(true);
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // RBAC Checks for UI styling and disabling
  const isTargetOwnerOrManager = !!(user && (user.role === 'owner' || user.role === 'manager'));
  const isManagerCaller = callerRole === 'manager';
  
  // Managers cannot edit existing owners/managers
  const isReadOnlyForCaller = !!(isManagerCaller && isTargetOwnerOrManager);

  // Last active owner protections: cannot change role or status if they are the last active owner
  const isLastOwnerProtectionActive = !!(isEdit && user?.role === 'owner' && isActiveOwnerLast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyForCaller) return;

    setLoading(true);
    setError(null);

    const payload = {
      full_name: fullName,
      email,
      phone: phone || null,
      role,
      is_active: isActive,
    };

    try {
      if (isEdit && user) {
        // Edit User
        const result = await updateUserAction(user.id, {
          ...payload,
          password: password || undefined,
        });

        if (result.success) {
          onClose();
        } else {
          setError(result.error || 'Failed to update user.');
        }
      } else {
        // Add User
        const result = await createUserAction(payload);
        if (result.success) {
          if (result.tempPassword) {
            setCreatedPassword(result.tempPassword);
          } else {
            onClose();
          }
        } else {
          setError(result.error || 'Failed to create user.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // If a temporary password was generated, show it to the user exactly once
  if (createdPassword) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-foreground">
        <div className="bg-card w-full max-w-md rounded-2xl border border-primary/20 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-1.5 rounded-[14px] border border-primary/5 pointer-events-none"></div>
          
          <div className="flex flex-col items-center text-center space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            
            <h3 className="text-xl font-serif font-bold text-primary">Account Created Successfully!</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              The user account has been provisioned. Below is the secure, randomly generated temporary password.
            </p>

            <div className="w-full bg-[#FAF9F5] border border-primary/10 rounded-xl p-4 my-2 flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">
                Temporary Password
              </span>
              <span className="font-mono text-lg font-bold text-[#9E690A] tracking-wider select-all px-3 py-1 bg-white border border-primary/5 rounded shadow-sm">
                {createdPassword}
              </span>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left flex items-start gap-3 w-full">
              <ShieldAlert className="w-5 h-5 text-[#9E690A] shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E690A]">Important Notice</p>
                <p className="text-[11px] text-muted-foreground/90 mt-1 leading-relaxed">
                  Provide this password to the staff member. This password is **shown only once** and cannot be retrieved again. It is not saved anywhere in plain text.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-xs py-3 rounded-lg mt-4 transition-all"
            >
              I Have Copied The Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-foreground">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-primary/20 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-1.5 rounded-[14px] border border-primary/5 pointer-events-none"></div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-primary/10">
          <div>
            <h3 className="text-lg font-serif font-bold text-primary">
              {isEdit ? (locale === 'en' ? 'Edit User' : 'Edytuj Konto') : (locale === 'en' ? 'Add User' : 'Dodaj Nowego Użytkownika')}
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              {isEdit ? 'Update details & access controls' : 'Register a new team member'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-primary/5 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative z-10 p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {isReadOnlyForCaller && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs flex gap-2">
              <ShieldAlert className="w-4 h-4 text-[#9E690A] shrink-0 mt-0.5" />
              <div className="text-muted-foreground">
                <p className="font-bold text-[#9E690A] uppercase text-[10px]">Restricted View</p>
                <p className="mt-0.5">As a Manager, you are not authorized to modify Owner or Manager accounts.</p>
              </div>
            </div>
          )}

          {isLastOwnerProtectionActive && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs flex gap-2">
              <ShieldAlert className="w-4 h-4 text-[#9E690A] shrink-0 mt-0.5" />
              <div className="text-muted-foreground">
                <p className="font-bold text-[#9E690A] uppercase text-[10px]">Last Active Owner Protection</p>
                <p className="mt-0.5">This user is the last active Owner. You cannot deactivate this account or demote its role to prevent lockout.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Full Name *
              </label>
              <input
                type="text"
                required
                disabled={isReadOnlyForCaller}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Anna Kowalska"
                className="w-full text-sm px-3.5 py-2.5 bg-background border border-primary/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 text-foreground"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Email Address *
              </label>
              <input
                type="email"
                required
                disabled={isEdit || isReadOnlyForCaller}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. anna@namaste.pl"
                className="w-full text-sm px-3.5 py-2.5 bg-background border border-primary/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 text-foreground"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Phone Number
              </label>
              <input
                type="tel"
                disabled={isReadOnlyForCaller}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +48 511 984 331"
                className="w-full text-sm px-3.5 py-2.5 bg-background border border-primary/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 text-foreground"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {isEdit ? 'Reset Password' : 'Password Credentials'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  disabled={isReadOnlyForCaller}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Auto-generated temporary' }
                  readOnly={!isEdit} // Auto-generated secure random password on create
                  className="w-full text-sm pl-3.5 pr-10 py-2.5 bg-background border border-primary/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 font-mono text-foreground"
                />
                {!isEdit && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Lock className="w-4 h-4 text-primary/40" />
                  </div>
                )}
                {isEdit && (
                  <button
                    type="button"
                    disabled={isReadOnlyForCaller}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Role select */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {locale === 'en' ? 'Role / Permissions *' : 'Rola / Uprawnienia *'}
              </label>
              <select
                disabled={isReadOnlyForCaller || isLastOwnerProtectionActive}
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full text-sm px-3.5 py-2.5 bg-background border border-primary/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 text-foreground"
              >
                {/* Owners can select any role. Managers can only select staff and kitchen */}
                {callerRole === 'owner' && <option value="owner">Owner (Właściciel)</option>}
                {callerRole === 'owner' && <option value="manager">Manager (Menedżer)</option>}
                <option value="kitchen">{locale === 'en' ? 'Kitchen (KDS)' : 'Kuchnia (Kucharz / KDS)'}</option>
                <option value="staff">Staff (Obsługa kelnerska)</option>
              </select>
            </div>

            {/* Status (is_active) select */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Account Status *
              </label>
              <select
                disabled={isReadOnlyForCaller || isLastOwnerProtectionActive}
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                className="w-full text-sm px-3.5 py-2.5 bg-background border border-primary/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 text-foreground"
              >
                <option value="active">Active (Aktywny)</option>
                <option value="inactive">Inactive (Zablokowany)</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 border-t border-primary/10 pt-5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-primary/10 text-muted-foreground hover:bg-primary/5 text-xs font-bold uppercase tracking-wider rounded transition-colors"
            >
              {locale === 'en' ? 'Cancel' : 'Anuluj'}
            </button>
            {!isReadOnlyForCaller && (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Zapisywanie...' : (isEdit ? (locale === 'en' ? 'Save' : 'Zapisz') : (locale === 'en' ? 'Add User' : 'Dodaj'))}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
