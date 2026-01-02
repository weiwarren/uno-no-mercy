'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabaseClient } from '@/lib/supabase';

export function LoginForm() {
  const supabase = getSupabaseClient();

  return (
    <div className="w-full">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#3b82f6',
                brandAccent: '#2563eb',
                inputBackground: '#1f2937',
                inputText: 'white',
                inputBorder: '#374151',
                inputBorderFocus: '#3b82f6',
                inputBorderHover: '#4b5563',
              },
            },
          },
          className: {
            container: 'auth-container',
            button: 'auth-button',
            input: 'auth-input',
          },
        }}
        theme="dark"
        providers={[]}
        redirectTo={typeof window !== 'undefined' ? window.location.origin : undefined}
      />
    </div>
  );
}
