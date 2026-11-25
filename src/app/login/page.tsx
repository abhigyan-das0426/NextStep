import React from 'react';
import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/50 flex flex-col items-center justify-center p-4 sm:p-6">
      <AuthForm />
    </main>
  );
}
