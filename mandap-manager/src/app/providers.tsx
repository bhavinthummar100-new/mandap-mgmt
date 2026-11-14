import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { router } from './router';

export function AppProviders() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          containerStyle={{
            top: 'max(12px, env(safe-area-inset-top))',
            left: '50%',
            right: 'auto',
            width: 'calc(100% - 24px)',
            maxWidth: '480px',
            transform: 'translateX(-50%)',
          }}
          toastOptions={{
            duration: 3000,
            style: {
              boxSizing: 'border-box',
              width: '100%',
              maxWidth: '100%',
              overflowWrap: 'anywhere',
              padding: '12px 16px',
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
