import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../shared/components/Button.jsx';
import { API_BASE_URL, requestOtp } from '../auth/authAPI.js';
import { normalizeAuthErrorMessage } from '../auth/utils.js';
import { savePendingAuthEmail } from '../auth/pendingAuthStorage.js';

const GoogleIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 533.5 544.3"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
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

const googleAuthUrl = `${API_BASE_URL}/auth/google`;

const LoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sanitizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!sanitizedEmail) {
      setErrorMessage('Informe um e-mail valido.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('Verificando...');
    setIsSubmitting(true);

    try {
      const response = await requestOtp({ email: sanitizedEmail });
      savePendingAuthEmail(sanitizedEmail);

      const deliveryMessage = response?.delivered
        ? 'Enviamos um codigo para o seu e-mail. Ele expira em 5 minutos.'
        : 'Se o e-mail estiver cadastrado, enviaremos o codigo em instantes.';

      setInfoMessage(deliveryMessage);

      setTimeout(() => {
        navigate('/auth/verify-otp', { replace: true });
      }, 600);
    } catch (error) {
      setInfoMessage('');
      setErrorMessage(
        normalizeAuthErrorMessage(error, 'E-mail ou senha incorretos. Tente novamente.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white/90 backdrop-blur shadow-xl rounded-2xl p-8 space-y-8">
        <header className="text-center space-y-3">
          <Link to="/" className="inline-flex items-center justify-center">
            <span className="text-3xl font-extrabold tracking-tight text-blue-700">
              Agenda Facil
            </span>
          </Link>
          <p className="text-sm text-gray-600">
            Bem-vindo de volta! Acesse sua conta para gerenciar seus agendamentos.
          </p>
        </header>

        <section className="space-y-4">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <GoogleIcon />
            <span className="font-semibold">Entrar com Google</span>
          </Button>

          <div className="flex items-center gap-4 text-xs text-gray-400 uppercase tracking-wider">
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
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute inset-y-0 right-3 flex items-center text-sm text-blue-500 hover:text-blue-700"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="invisible">.</div>
            <Link to="/forgot-password" className="text-blue-600 font-semibold hover:underline">
              Esqueceu sua senha?
            </Link>
          </div>

          {errorMessage && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMessage}
            </div>
          )}

          {infoMessage && !errorMessage && (
            <div className="text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              {infoMessage}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
            <span className="flex items-center justify-center gap-2">
              {isSubmitting && (
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {isSubmitting ? 'Verificando…' : 'Entrar'}
            </span>
          </Button>
        </form>

        <div className="text-center text-sm text-gray-600">
          Ainda nao tem conta?{' '}
          <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
            Crie agora
          </Link>
        </div>

        <footer className="text-center text-xs text-gray-400">
          Ao continuar, voce concorda com nossos{' '}
          <Link to="/terms" className="underline hover:text-gray-500">
            Termos de Uso
          </Link>{' '}
          e{' '}
          <Link to="/privacy" className="underline hover:text-gray-500">
            Politica de Privacidade
          </Link>
          .
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
