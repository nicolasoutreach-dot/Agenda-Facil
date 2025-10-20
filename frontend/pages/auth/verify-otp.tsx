import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { clearPendingAuthEmail, readPendingAuthEmail, savePendingAuthEmail } from '../../src/features/auth/pendingAuthStorage.js';
import { normalizeAuthErrorMessage, resolveSafeRedirectPath } from '../../src/features/auth/utils.js';

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';

const getApiBaseUrl = () => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;

  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/\/+$/, '');
  }

  return DEFAULT_API_BASE_URL;
};

type VerifyOtpResponse = {
  nextRedirect?: string;
  delivered?: boolean;
};

type ApiErrorPayload = {
  message?: string;
  [key: string]: unknown;
};

const VerifyOtpPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [wasLastDeliverySuccessful, setWasLastDeliverySuccessful] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    const storedEmail = readPendingAuthEmail();

    if (storedEmail) {
      setEmail(storedEmail);
      setIsInitializing(false);
      return;
    }

    if (!router.isReady) {
      return;
    }

    setIsInitializing(false);
    router.replace('/login').catch((navigationError) => {
      console.error('Failed to redirect to login page:', navigationError);
    });
  }, [router]);

  const displayEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sanitizedOtp = otp.trim();

    if (!sanitizedOtp) {
      setErrorMessage('Informe o codigo recebido por e-mail.');
      return;
    }

    if (!displayEmail) {
      setErrorMessage('Nao encontramos o e-mail associado a este acesso. Tente novamente.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('Validando o codigo informado...');
    setIsVerifying(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: displayEmail, otp: sanitizedOtp }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
        const error = {
          response: { data: payload },
          message:
            typeof payload.message === 'string' && payload.message.trim().length > 0
              ? payload.message
              : response.statusText,
        };
        throw error;
      }

      const payload = (await response.json().catch(() => ({}))) as VerifyOtpResponse;
      clearPendingAuthEmail();

      setInfoMessage('Autenticacao concluida. Redirecionando para o seu painel...');
      const nextPath = resolveSafeRedirectPath(payload?.nextRedirect);
      setTimeout(() => {
        router
          .replace(nextPath)
          .catch((navigationError) => console.error('Failed to redirect after verifying OTP:', navigationError));
      }, 400);
    } catch (error) {
      setInfoMessage('');
      setErrorMessage(
        normalizeAuthErrorMessage(error, 'Codigo invalido ou expirado. Solicite um novo acesso.'),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!displayEmail || isResending) {
      return;
    }

    setErrorMessage('');
    setInfoMessage('Reenviando acesso...');
    setIsResending(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: displayEmail }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
        const error = {
          response: { data: payload },
          message:
            typeof payload.message === 'string' && payload.message.trim().length > 0
              ? payload.message
              : response.statusText,
        };
        throw error;
      }

      const payload = (await response.json().catch(() => ({}))) as VerifyOtpResponse;
      savePendingAuthEmail(displayEmail);
      setWasLastDeliverySuccessful(Boolean(payload?.delivered));
      setInfoMessage(
        payload?.delivered
          ? 'Enviamos um novo codigo. Verifique seu e-mail em instantes.'
          : 'Se o e-mail estiver cadastrado, o codigo chegara em instantes.',
      );
    } catch (error) {
      setInfoMessage('');
      setErrorMessage(
        normalizeAuthErrorMessage(error, 'Nao foi possivel reenviar o acesso. Tente novamente em instantes.'),
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleUseAnotherEmail = () => {
    clearPendingAuthEmail();
    router.replace('/login').catch((navigationError) => {
      console.error('Failed to redirect to login page:', navigationError);
    });
  };

  if (isInitializing) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Verificar acesso | Agenda Facil</title>
      </Head>
      <main className="bg-gray-100 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">Verificar acesso</h1>
          <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm mb-6">
            <p>
              Enviamos instrucoes para <strong>{displayEmail}</strong>.
            </p>
            <p className="mt-1">
              Digite abaixo o codigo OTP recebido para concluir seu login. Este codigo expira em 5 minutos.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Codigo OTP
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Digite o codigo recebido"
                className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                autoComplete="one-time-code"
              />
            </label>

            {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
            {infoMessage && !errorMessage ? (
              <p className="text-sm text-blue-600">{infoMessage}</p>
            ) : null}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
              disabled={isVerifying}
            >
              {isVerifying ? 'Verificando...' : 'Confirmar acesso'}
            </button>
          </form>

          <div className="flex flex-col gap-3 text-sm text-center mt-6">
            <button
              type="button"
              onClick={handleResend}
              className="text-blue-600 font-semibold hover:underline disabled:text-blue-300"
              disabled={isResending}
            >
              {isResending ? 'Reenviando...' : 'Reenviar codigo'}
            </button>
            <button
              type="button"
              onClick={handleUseAnotherEmail}
              className="text-gray-500 hover:underline"
            >
              Usar outro e-mail
            </button>
            {!wasLastDeliverySuccessful ? (
              <span className="text-xs text-gray-500">
                Caso nao encontre o e-mail, verifique a caixa de spam.
              </span>
            ) : null}
          </div>

          <div className="mt-8 text-center text-sm text-gray-600 space-y-2">
            <p>
              <Link href="/" className="text-gray-500 hover:underline">
                Voltar para o site
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default VerifyOtpPage;
