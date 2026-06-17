'use client';

import { useLocale } from 'next-intl';

import React, { useState } from 'react';
import { 
  Users, UserCheck, ShieldCheck, ChefHat, UserX, 
  Plus, Edit3, ShieldAlert, KeyRound, Unlock, Lock
} from 'lucide-react';
import PremiumCard from '@/components/ui/premium-card';
import StatusPill from '@/components/ui/status-pill';
import UserModal from './user-modal';
import { toggleUserStatusAction } from '@/app/admin/users/actions';

interface User {
  id: string;
  email: string;
  role: 'owner' | 'manager' | 'kitchen' | 'staff';
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

interface UsersDashboardProps {
  initialUsers: User[];
  caller: {
    id: string;
    role: 'owner' | 'manager';
  };
}

export default function UsersDashboard({ initialUsers, caller }: UsersDashboardProps) {
  const locale = useLocale();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Status message state
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate metrics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const managersCount = users.filter(u => u.role === 'manager').length;
  const kitchenCount = users.filter(u => u.role === 'kitchen').length;
  const staffCount = users.filter(u => u.role === 'staff').length;
  
  // Count active owners
  const activeOwners = users.filter(u => u.role === 'owner' && u.is_active);
  const isActiveOwnerLast = activeOwners.length <= 1;

  // Filter users based on search query
  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.phone && u.phone.includes(term)) ||
      u.role.toLowerCase().includes(term)
    );
  });

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    // RBAC: Managers cannot toggle owners/managers
    if (caller.role === 'manager' && (user.role === 'owner' || user.role === 'manager')) {
      setErrorMessage('Access Denied: Managers cannot modify status of owner or manager accounts.');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    // Owner protection: cannot deactivate last active owner
    if (user.role === 'owner' && user.is_active && isActiveOwnerLast) {
      setErrorMessage('Access Denied: Cannot deactivate the last active owner.');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    const newStatus = !user.is_active;

    try {
      const result = await toggleUserStatusAction(user.id, newStatus);
      if (result.success) {
        // Update local state
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
        setInfoMessage(`User ${user.full_name} status updated successfully.`);
        setTimeout(() => setInfoMessage(null), 4000);
      } else {
        setErrorMessage(result.error || 'Failed to update user status.');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Reload users list by forcing page refresh (actions revalidate the path anyway)
    window.location.reload();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner (Właściciel)';
      case 'manager': return 'Manager (Menedżer)';
      case 'kitchen': return 'Kitchen (KDS)';
      case 'staff': return 'Staff (Obsługa)';
      default: return role;
    }
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-primary/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">{locale === 'en' ? 'Users & Roles' : 'Użytkownicy i Uprawnienia'}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage staff login credentials, administrative levels, and operational roles.
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          {locale === 'en' ? 'Add New User' : 'Dodaj Użytkownika'}
        </button>
      </div>

      {/* Action alerts */}
      {infoMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 transition-all">
          <UserCheck className="w-4 h-4 text-green-600 shrink-0" />
          <span className="font-semibold">{infoMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 transition-all">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* Total Users */}
        <PremiumCard className="relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Users</p>
            <Users className="w-4 h-4 text-primary opacity-60" />
          </div>
          <p className="text-3xl font-bold text-primary font-serif">{totalUsers}</p>
          <p className="text-[9px] text-muted-foreground/50 mt-2">Wszyscy użytkownicy</p>
        </PremiumCard>

        {/* Active Users */}
        <PremiumCard className="relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Users</p>
            <UserCheck className="w-4 h-4 text-green-600 opacity-70" />
          </div>
          <p className="text-3xl font-bold text-green-700 font-serif">{activeUsers}</p>
          <p className="text-[9px] text-muted-foreground/50 mt-2">Konta aktywne</p>
        </PremiumCard>

        {/* Managers */}
        <PremiumCard className="relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Managers</p>
            <ShieldCheck className="w-4 h-4 text-primary opacity-60" />
          </div>
          <p className="text-3xl font-bold text-primary font-serif">{managersCount}</p>
          <p className="text-[9px] text-muted-foreground/50 mt-2">Menedżerowie</p>
        </PremiumCard>

        {/* Kitchen Accounts */}
        <PremiumCard className="relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kitchen (KDS)</p>
            <ChefHat className="w-4 h-4 text-primary opacity-60" />
          </div>
          <p className="text-3xl font-bold text-primary font-serif">{kitchenCount}</p>
          <p className="text-[9px] text-muted-foreground/50 mt-2">Konta kuchenne</p>
        </PremiumCard>

        {/* Staff Accounts */}
        <PremiumCard className="relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff Accounts</p>
            <Users className="w-4 h-4 text-primary opacity-60" />
          </div>
          <p className="text-3xl font-bold text-primary font-serif">{staffCount}</p>
          <p className="text-[9px] text-muted-foreground/50 mt-2">Obsługa restauracji</p>
        </PremiumCard>

      </div>

      {/* Main Table section */}
      <PremiumCard className="overflow-hidden">
        {/* Table Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-primary/5 gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-primary">Team Members & Access Control</h2>
            <p className="text-xs text-muted-foreground">Search and manage system accounts</p>
          </div>
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by name, email, phone or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-background border border-primary/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-6">
          <div className="inline-block min-w-full align-middle px-6">
            <table className="min-w-full divide-y divide-primary/5">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-primary/5">
                  <th className="py-4 px-3">User</th>
                  <th className="py-4 px-3">Role</th>
                  <th className="py-4 px-3">Status</th>
                  <th className="py-4 px-3">Phone</th>
                  <th className="py-4 px-3">Last Login</th>
                  <th className="py-4 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground/75 font-semibold">
                      {locale === 'en' ? 'No matching users found.' : 'Brak użytkowników spełniających kryteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === caller.id;
                    const isProtected = user.role === 'owner' || user.role === 'manager';
                    const isBlockedForCaller = caller.role === 'manager' && isProtected;
                    const isLastOwner = user.role === 'owner' && isActiveOwnerLast;

                    return (
                      <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                        {/* User Details */}
                        <td className="py-4 px-3 flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {getInitials(user.full_name)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground flex items-center gap-1.5">
                              {user.full_name}
                              {isSelf && (
                                <span className="bg-primary/15 text-primary text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full uppercase">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground/80">{user.email}</p>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                            user.role === 'owner' 
                              ? 'bg-purple-500/10 text-purple-700 border-purple-500/25'
                              : user.role === 'manager'
                              ? 'bg-blue-500/10 text-blue-700 border-blue-500/25'
                              : user.role === 'kitchen'
                              ? 'bg-amber-500/10 text-amber-700 border-amber-500/25'
                              : 'bg-slate-500/10 text-slate-700 border-slate-500/25'
                          }`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <StatusPill 
                            status={user.is_active ? 'success' : 'error'} 
                            label={user.is_active ? 'Active' : 'Inactive'} 
                          />
                        </td>

                        {/* Phone */}
                        <td className="py-4 px-3 text-xs text-muted-foreground font-medium whitespace-nowrap">
                          {user.phone || '—'}
                        </td>

                        {/* Last Login */}
                        <td className="py-4 px-3 text-xs text-muted-foreground font-medium whitespace-nowrap">
                          {user.last_login ? user.last_login : 'Never'}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-3 text-right space-x-1.5 whitespace-nowrap">
                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={isBlockedForCaller || (isLastOwner && user.is_active)}
                            className={`p-1.5 rounded transition-colors ${
                              user.is_active 
                                ? 'text-green-600 hover:text-red-600 hover:bg-red-500/10' 
                                : 'text-muted-foreground hover:text-green-600 hover:bg-green-500/10'
                            } disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-current`}
                            title={
                              isBlockedForCaller 
                                ? 'Unauthorized to modify owner/manager status' 
                                : isLastOwner && user.is_active
                                ? 'Cannot deactivate the final owner'
                                : user.is_active 
                                ? 'Block user account' 
                                : 'Activate user account'
                            }
                          >
                            {user.is_active ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>

                          {/* Edit Details Button */}
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded transition-all"
                            title="Edit user details and roles"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PremiumCard>

      {/* Permissions Explanation Panel */}
      <div className="border border-primary/10 rounded-2xl bg-card/25 p-6 md:p-8 space-y-6">
        <div className="flex items-center space-x-2 text-primary">
          <KeyRound className="w-5 h-5" />
          <h2 className="text-lg font-serif font-bold">Permissions & System Roles Mapping</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs leading-relaxed">
          <div className="space-y-2 border border-primary/5 bg-[#FAF9F5]/40 rounded-xl p-4">
            <h3 className="font-bold text-purple-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-700" />
              OWNER (Właściciel)
            </h3>
            <p className="text-muted-foreground">
              Full administrative access. Only Owners can create or demote other Owners and Managers, access secure log audit traces, modify core database components, and delete system logs.
            </p>
          </div>

          <div className="space-y-2 border border-primary/5 bg-[#FAF9F5]/40 rounded-xl p-4">
            <h3 className="font-bold text-blue-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-700" />
              MANAGER (Menedżer)
            </h3>
            <p className="text-muted-foreground">
              Operational access. Can approve/cancel orders, manage reservations, tweak site menus, and update settings. Can view all team accounts, but cannot modify, demote, or create Owner/Manager accounts.
            </p>
          </div>

          <div className="space-y-2 border border-primary/5 bg-[#FAF9F5]/40 rounded-xl p-4">
            <h3 className="font-bold text-amber-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-700" />
              KITCHEN (KDS)
            </h3>
            <p className="text-muted-foreground">
              Kitchen staff access. Locked strictly to the Kitchen Display System (`/admin/kds`). Cannot see order financial totals, cannot access reservation details, and cannot edit menus or settings.
            </p>
          </div>

          <div className="space-y-2 border border-primary/5 bg-[#FAF9F5]/40 rounded-xl p-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-700" />
              STAFF (Obsługa kelnerska)
            </h3>
            <p className="text-muted-foreground">
              Front-of-house access. Can view active reservation calendars and orders, but is completely blocked from system configurations, role management, menu CMS changes, or security actions.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      <UserModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        user={selectedUser}
        callerRole={caller.role}
        isActiveOwnerLast={isActiveOwnerLast}
      />

    </div>
  );
}
