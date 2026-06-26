import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoginForm from './login-form';

export default function AdminLoginPage() {
  return (
    <div className="admin-theme min-h-screen flex items-center justify-center bg-background p-4 text-foreground">
      <Card className="border border-border bg-card max-w-md w-full p-6 space-y-6 shadow-2xl relative">
        <div className="absolute inset-0 bg-radial-gradient from-primary/5 to-transparent pointer-events-none rounded-lg" />
        <CardHeader className="text-center pb-2 relative z-10 flex flex-col items-center">
          <img
            src="/images/logo.png"
            alt="Namaste Logo"
            className="h-20 w-auto object-contain mb-3"
          />
          <CardTitle className="text-2xl font-serif font-bold text-primary tracking-wide">
            Namaste Admin
          </CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-1">
            Restaurant Management Panel
          </p>
        </CardHeader>
        <CardContent className="relative z-10">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}

