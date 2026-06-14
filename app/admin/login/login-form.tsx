'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import GoldSpinner from '@/components/ui/gold-spinner';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Check if user has admin/manager role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        // Sign out to not leave orphaned session if user is not authorized
        await supabase.auth.signOut();
        setError('Unauthorized: Admin profile not found.');
        setLoading(false);
        return;
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        setError('Unauthorized: Admin account is inactive.');
        setLoading(false);
        return;
      }

      if (profile.role !== 'owner' && profile.role !== 'manager') {
        await supabase.auth.signOut();
        setError('Unauthorized: Insufficient permissions.');
        setLoading(false);
        return;
      }

      // If authorized, route to admin dashboard
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 font-sans text-left">
      {error && (
        <div className="p-3 text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded text-red-600 dark:text-red-400 text-center leading-relaxed">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="admin@namaste.com"
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium tracking-wide"
      >
        {loading ? <GoldSpinner size="sm" /> : 'Log In to Dashboard'}
      </Button>
    </form>
  );
}
