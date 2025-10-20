import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { FormEvent, useMemo, useState } from 'react';

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

const STORAGE_KEY = 'agenda-facil:pending-auth-email';

const savePendingAuthEmail = (email: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, email.trim().toLowerCase());
  } catch (error) {
    console.warn('Session storage unavailable. Skipping persistence.', error);
  }
};

const normalizeAuthErrorMessage = (error: unknown, fallback: string) => {
  const message =
    ((error as { message?: string })?.message ??
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      '') || '';

  if (/invalid or expired otp code/i.test(message)) {
    return 'Codigo expirado ou invalido. Solicite um novo acesso.';
  }

  if (/invalid or expired magic link token/i.test(message)) {
    return 'Link invalido ou expirado. Solicite um novo acesso.';
  }

  if (/email.*not.*found/i.test(message)) {
    return 'Nao encontramos este e-mail. Verifique o endereco informado.';
  }

  if (message && !/internal server error/i.test(message)) {
    return message;
  }

  return fallback;
};

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      fill="#4285f4"
      d="M533.5 278.4c0-17.4-1.5-34.1-4.4-50.4H272v95.4h147.4c-6.4 34.6-25.7 64-54.7 83.6v69.4h88.4c51.7-47.7 80.4-118 80.4-197.9z"
    />
    <path
      fill="#34a853"
      d="M272 544.3c73 0 134.3-24.2 179.1-65.9l-88.4-69.4c-24.6 16.5-56.1 26-90.7 26-69.7 0-128.7-47-149.8-110.2H30.6v69.8C74.8 482.7 167.4 544.3 272 544.3z"
    />
    <path
      fill="#fbbc04"
      d="M122.2 325.1c-11.2-33.5-11.2-69.5 0-103l-.1-69.8H30.6c-40.5 80.8-40.5 174.8 0 255.6l91.6-69.8z"
    />
    <path
      fill="#ea4335"
      d="M272 107.7c37.9-.6 74 13.5 101.7 39.5l76.1-76.1C406.4 24.2 345 0 272 0 167.4 0 74.8 61.6 30.6 157.4l91.6 69.8C143.3 164.5 202.3 117.5 272 117.5z"
    />
  </svg>
);

const LoginPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const sanitizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sanitizedEmail) {
      setErrorMessage('Informe um e-mail valido.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('Verificando...');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: sanitizedEmail }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = normalizeAuthErrorMessage(payload, 'E-mail ou senha incorretos. Tente novamente.');
        throw new Error(message);
      }

      const payload = await response.json();

      savePendingAuthEmail(sanitizedEmail);

      const deliveryMessage = payload?.delivered
        ? 'Enviamos um codigo para o seu e-mail. Ele expira em 5 minutos.'
        : 'Se o e-mail estiver cadastrado, enviaremos o codigo em instantes.';

      setInfoMessage(deliveryMessage);

      setTimeout(() => {
        router.push('/auth/verify-otp').catch((error) => {
          console.error('Failed to navigate to verify OTP page:', error);
        });
      }, 600);
    } catch (error) {
      const message = normalizeAuthErrorMessage(error, 'E-mail ou senha incorretos. Tente novamente.');
      setInfoMessage('');
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      await signIn('google', { callbackUrl: '/dashboard' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Entrar | Agenda Facil</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/90 p-8 shadow-xl backdrop-blur">
          <header className="text-center space-y-3">
            <Link href="/" className="inline-flex items-center justify-center">
              <span className="text-3xl font-extrabold tracking-tight text-blue-700">Agenda Facil</span>
            </Link>
            <p className="text-sm text-gray-600">
              Bem-vindo de volta! Acesse sua conta para gerenciar seus agendamentos.
            </p>
          </header>

          <section className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              <span>{isGoogleLoading ? 'Conectando...' : 'Entrar com Google'}</span>
            </button>

            <div className="flex items-center gap-4 text-xs uppercase tracking-wider text-gray-400">
              <span className="flex-1 h-px bg-gray-200" />
              <span>ou entre com seu e-mail</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seunome@exemplo.com"
                autoComplete="email"
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Informe sua senha"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-12 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-blue-500 hover:text-blue-700"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="invisible">placeholder</span>
              <Link href="/forgot-password" className="text-blue-600 font-semibold hover:underline">
                Esqueceu sua senha?
              </Link>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {infoMessage && !errorMessage && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-600">
                {infoMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isSubmitting ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          <div className="text-center text-sm text-gray-600">
            Ainda nao tem conta?{' '}
            <Link href="/signup" className="text-blue-600 font-semibold hover:underline">
              Crie agora
            </Link>
          </div>

          <footer className="text-center text-xs text-gray-400">
            Ao continuar, voce concorda com nossos{' '}
            <Link href="/terms" className="underline hover:text-gray-500">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link href="/privacy" className="underline hover:text-gray-500">
              Politica de Privacidade
            </Link>
            .
          </footer>
        </div>
      </main>
    </>
  );
};

export default LoginPage;
