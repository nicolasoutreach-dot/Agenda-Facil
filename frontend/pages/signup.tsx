import Head from 'next/head';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';

type RegisterFormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  termsAccepted: boolean;
};

type FieldName = keyof RegisterFormData;

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';

function getApiBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;

  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/\/+$/, '');
  }

  return DEFAULT_API_BASE_URL;
}

const initialFormState: RegisterFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  businessName: '',
  termsAccepted: false,
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

const validateField = (field: FieldName, data: RegisterFormData): string | null => {
  switch (field) {
    case 'name': {
      const value = data.name.trim();
      if (!value) {
        return 'Informe seu nome completo.';
      }
      if (value.length < 3) {
        return 'O nome deve ter pelo menos 3 caracteres.';
      }
      return null;
    }
    case 'email': {
      const value = data.email.trim().toLowerCase();
      if (!value) {
        return 'Informe um e-mail valido.';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Formato de e-mail invalido.';
      }
      return null;
    }
    case 'phone': {
      const digits = data.phone.replace(/\D/g, '');
      if (!digits) {
        return 'Informe um telefone ou WhatsApp.';
      }
      if (digits.length < 10 || digits.length > 13) {
        return 'Informe um telefone valido com DDD.';
      }
      return null;
    }
    case 'password': {
      const value = data.password;
      if (value.length < 8) {
        return 'A senha deve ter pelo menos 8 caracteres.';
      }
      if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
        return 'A senha deve conter letras e numeros.';
      }
      return null;
    }
    case 'confirmPassword': {
      if (!data.confirmPassword) {
        return 'Confirme sua senha.';
      }
      if (data.confirmPassword !== data.password) {
        return 'As senhas nao conferem.';
      }
      return null;
    }
    case 'businessName': {
      const value = data.businessName.trim();
      if (!value) {
        return 'Informe o nome do negocio.';
      }
      if (value.length < 3) {
        return 'O nome do negocio deve ter pelo menos 3 caracteres.';
      }
      return null;
    }
    case 'termsAccepted': {
      if (!data.termsAccepted) {
        return 'Voce precisa aceitar os termos.';
      }
      return null;
    }
    default:
      return null;
  }
};

const SignupPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>(initialFormState);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<FieldName, boolean>>>({});
  const [formErrors, setFormErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

  const getFieldClasses = (field: FieldName) => {
    const hasError = Boolean(touchedFields[field] && formErrors[field]);
    const base =
      'w-full rounded-lg border px-4 py-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 transition';
    return hasError
      ? `${base} border-red-400 focus:border-red-500 focus:ring-red-200`
      : `${base} border-gray-200 focus:border-blue-500 focus:ring-blue-200`;
  };

  const updateFieldState = (field: FieldName, value: string | boolean) => {
    const nextFormData = { ...formData, [field]: value } as RegisterFormData;
    setFormData(nextFormData);
    setTouchedFields((current) => ({ ...current, [field]: true }));

    setFormErrors((current) => {
      const nextErrors = { ...current };
      const message = validateField(field, nextFormData);

      if (message) {
        nextErrors[field] = message;
      } else {
        delete nextErrors[field];
      }

      if (field === 'password' || field === 'confirmPassword') {
        const confirmMessage = validateField('confirmPassword', nextFormData);
        if (confirmMessage) {
          nextErrors.confirmPassword = confirmMessage;
        } else {
          delete nextErrors.confirmPassword;
        }
      }

      return nextErrors;
    });
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const target = event.target;
    const field = target.name as FieldName;

    let nextValue: string | boolean;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      nextValue = target.checked;
    } else {
      nextValue = target.value;
    }

    updateFieldState(field, nextValue);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const field = event.target.name as FieldName;
    setTouchedFields((current) => ({ ...current, [field]: true }));
    setFormErrors((current) => {
      const nextErrors = { ...current };
      const message = validateField(field, formData);
      if (message) {
        nextErrors[field] = message;
      } else {
        delete nextErrors[field];
      }
      return nextErrors;
    });
  };

  const validateAllFields = (data: RegisterFormData) => {
    const fields: FieldName[] = [
      'name',
      'email',
      'phone',
      'password',
      'confirmPassword',
      'businessName',
      'termsAccepted',
    ];

    const validationResult: Partial<Record<FieldName, string>> = {};

    fields.forEach((field) => {
      const message = validateField(field, data);
      if (message) {
        validationResult[field] = message;
      }
    });

    setTouchedFields((current) => ({
      ...current,
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      businessName: true,
      termsAccepted: true,
    }));

    setFormErrors(validationResult);

    return Object.keys(validationResult).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const isValid = validateAllFields(formData);

    if (!isValid) {
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      nomeDoNegocio: formData.businessName.trim() || null,
      servicos: [],
      horarios: {},
      politicaConfirmacao: 'manual',
      onboardingIncompleto: true,
    };

    setIsLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadResponse = await response.json().catch(() => ({}));
        const message =
          (typeof payloadResponse?.message === 'string' && payloadResponse.message.trim().length > 0
            ? payloadResponse.message
            : null) ?? 'Falha ao registrar. Tente novamente.';
        throw new Error(message);
      }

      const result = await response.json().catch(() => ({}));
      const message =
        typeof result.message === 'string' && result.message.trim().length > 0
          ? result.message
          : 'Conta criada com sucesso!';

      setSuccessMessage(message);
      setFormData(initialFormState);
      setTouchedFields({});
      setFormErrors({});
      void router.push('/onboarding?welcome=1');
    } catch (submitError) {
      const fallbackMessage = 'Falha ao registrar. Tente novamente.';
      setError(submitError instanceof Error ? submitError.message : fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard', redirect: true });
    } catch (googleError) {
      console.error('Google sign-in failed:', googleError);
      setError('Nao foi possivel iniciar o login social. Tente novamente.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const shouldDisableSubmit = () => {
    if (isLoading || isGoogleLoading) {
      return true;
    }
    const fields: FieldName[] = [
      'name',
      'email',
      'phone',
      'password',
      'confirmPassword',
      'businessName',
      'termsAccepted',
    ];
    return fields.some((field) => Boolean(validateField(field, formData)));
  };

  const renderError = (field: FieldName) =>
    touchedFields[field] && formErrors[field] ? (
      <p className="text-sm text-red-500">{formErrors[field]}</p>
    ) : null;

  return (
    <>
      <Head>
        <title>Criar Conta | Agenda Facil</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl rounded-2xl bg-white/90 p-8 shadow-xl backdrop-blur">
          <header className="text-center space-y-3 mb-8">
            <Link href="/" className="inline-flex items-center justify-center">
              <span className="text-3xl font-extrabold tracking-tight text-blue-700">Agenda Facil</span>
            </Link>
            <p className="text-sm text-gray-600">
              Crie uma conta para gerenciar agendamentos, contatos e oferecer servicos personalizados ao seu publico.
            </p>
          </header>

          <section className="mb-8 space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={isGoogleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              <span>{isGoogleLoading ? 'Conectando...' : 'Entrar com Google'}</span>
            </button>

            <div className="flex items-center gap-4 text-xs uppercase tracking-wider text-gray-400">
              <span className="flex-1 h-px bg-gray-200" />
              <span>ou complete o cadastro</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-semibold text-gray-700">
                  Nome completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Nome e sobrenome"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getFieldClasses('name')}
                />
                {renderError('name')}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seunome@exemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getFieldClasses('email')}
                />
                {renderError('email')}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="businessName" className="text-sm font-semibold text-gray-700">
                  Nome do negocio
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  placeholder="Ex: Studio Beleza Viva"
                  value={formData.businessName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getFieldClasses('businessName')}
                />
                {renderError('businessName')}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                  Telefone ou WhatsApp
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(11) 98888-7777"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getFieldClasses('phone')}
                />
                {renderError('phone')}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Crie uma senha forte"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getFieldClasses('password')}
                />
                <p className="text-xs text-gray-500">Minimo de 8 caracteres com letras e numeros.</p>
                {renderError('password')}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                  Confirmacao da senha
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={getFieldClasses('confirmPassword')}
                />
                {renderError('confirmPassword')}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <label className="flex items-start gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  Confirmo que li e aceito os{' '}
                  <Link href="/terms" className="text-blue-600 font-semibold hover:underline">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link href="/privacy" className="text-blue-600 font-semibold hover:underline">
                    Politica de Privacidade
                  </Link>
                  .
                </span>
              </label>
              {renderError('termsAccepted')}
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            {successMessage && (
              <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-600">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={shouldDisableSubmit()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isLoading ? 'Registrando...' : 'Registrar'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            Ja possui uma conta?{' '}
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">
              Fazer login
            </Link>
          </div>

          <p className="mt-2 text-center text-xs text-gray-400">
            Ao finalizar, voce sera direcionado ao painel para concluir o onboarding do negocio.
          </p>
        </div>
      </main>
    </>
  );
};

export default SignupPage;
