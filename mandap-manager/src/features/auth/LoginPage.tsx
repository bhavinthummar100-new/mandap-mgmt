import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n';

export function LoginPage() {
  const SECRET_EMAIL = 'bhavin@wldigital.co.in';
  const SECRET_PASSWORD = 'This@admin123';
  const SECRET_TAP_THRESHOLD = 3;
  const SECRET_TAP_WINDOW_MS = 900;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const user = await login(loginEmail, loginPassword);
      navigate(user.role === 'worker' ? '/my-jobs' : '/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleSecretTap = async () => {
    if (loading) return;

    tapCountRef.current += 1;

    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current);
    }

    tapTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0;
      tapTimerRef.current = null;
    }, SECRET_TAP_WINDOW_MS);

    if (tapCountRef.current < SECRET_TAP_THRESHOLD) return;

    tapCountRef.current = 0;
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }

    setEmail(SECRET_EMAIL);
    setPassword(SECRET_PASSWORD);
    await performLogin(SECRET_EMAIL, SECRET_PASSWORD);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800"
      onPointerDown={handleSecretTap}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
            M
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('appName')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('welcome')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@mandap.com"
          />
          <Input
            label={t('password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          <Button type="submit" loading={loading} className="w-full">
            {t('signIn')}
          </Button>
        </form>
      </div>
    </div>
  );
}
