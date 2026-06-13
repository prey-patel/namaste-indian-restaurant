import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoginForm from './login-form';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070B1E] p-4">
      <Card className="border border-primary/25 bg-[#050B1E]/60 backdrop-blur-md max-w-md w-full p-6 space-y-6 shadow-2xl relative">
        <div className="absolute inset-0 bg-radial-gradient from-primary/5 to-transparent pointer-events-none rounded-lg" />
        <CardHeader className="text-center pb-2 relative z-10">
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

