import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import type { NextPage } from 'next';
import { useEffect, useMemo, useState } from 'react';

import { fetchSession, submitOnboarding } from '../src/features/auth/authAPI.js';
import { normalizeAuthErrorMessage } from '../src/features/auth/utils.js';

type DayKey = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

type DaySchedule = {
  enabled: boolean;
  inicio: string;
  fim: string;
};

type HorariosState = Record<DayKey, DaySchedule>;

type SessionUser = {
  name?: string;
  email?: string;
  nomeDoNegocio?: string | null;
  servicos?: string[];
  horarios?: Partial<Record<DayKey, { inicio?: string; fim?: string }>>;
  politicaConfirmacao?: 'manual' | 'automatica';
  onboardingIncompleto?: boolean;
};

type SessionResponse = {
  user?: SessionUser;
};

type FormState = {
  nomeDoNegocio: string;
  servicos: string[];
  serviceInput: string;
  horarios: HorariosState;
  politicaConfirmacao: 'manual' | 'automatica';
};

const DAYS_OF_WEEK: Array<{ key: DayKey; label: string }> = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const STEP_TITLES = ['Sobre o negócio', 'Serviços oferecidos', 'Agenda e confirmações'];

const DEFAULT_TIME_RANGE = { inicio: '09:00', fim: '18:00' };

const createDefaultHorarios = (
  existing: SessionUser['horarios'] = {},
): HorariosState =>
  DAYS_OF_WEEK.reduce<HorariosState>((accumulator, day) => {
    const entry = existing?.[day.key];
    const inicio = typeof entry?.inicio === 'string' && entry.inicio.trim().length > 0 ? entry.inicio : DEFAULT_TIME_RANGE.inicio;
    const fim = typeof entry?.fim === 'string' && entry.fim.trim().length > 0 ? entry.fim : DEFAULT_TIME_RANGE.fim;

    accumulator[day.key] = {
      enabled: Boolean(entry?.inicio && entry?.fim),
      inicio,
      fim,
    };

    return accumulator;
  }, {} as HorariosState);

const mapHorariosToPayload = (horarios: HorariosState) =>
  Object.entries(horarios).reduce<Record<string, { inicio: string; fim: string }>>((accumulator, [day, data]) => {
    if (data.enabled) {
      accumulator[day] = {
        inicio: data.inicio,
        fim: data.fim,
      };
    }
    return accumulator;
  }, {});

const OnboardingPage: NextPage = () => {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormState>(() => ({
    nomeDoNegocio: '',
    servicos: [],
    serviceInput: '',
    horarios: createDefaultHorarios(),
    politicaConfirmacao: 'manual',
  }));

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    let isMounted = true;

    const loadSession = async () => {
      setIsSessionLoading(true);
      try {
        const response = (await fetchSession()) as SessionResponse;
        const user = response?.user ?? null;

        if (!isMounted) {
          return;
        }

        if (user?.onboardingIncompleto === false) {
          setSessionUser(user);
          await router.replace('/dashboard');
          return;
        }

        setSessionUser(user);

        if (user) {
          setFormData((previous) => ({
            nomeDoNegocio: user.nomeDoNegocio ?? previous.nomeDoNegocio ?? '',
            servicos: Array.isArray(user.servicos) && user.servicos.length > 0 ? user.servicos : previous.servicos,
            serviceInput: '',
            horarios: createDefaultHorarios(user.horarios),
            politicaConfirmacao: user.politicaConfirmacao ?? 'manual',
          }));
        }

        if (router.query.welcome === '1') {
          setInfoMessage('Conta criada com sucesso! Complete o onboarding para começar a atender.');
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = normalizeAuthErrorMessage(error, 'Não foi possível carregar sua sessão.');
        setErrorMessage(message);
        setSessionUser(null);
      } finally {
        if (isMounted) {
          setIsSessionLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const activeDaysCount = useMemo(
    () => Object.values(formData.horarios).filter((entry) => entry.enabled).length,
    [formData.horarios],
  );

  const resetInfo = () => {
    setInfoMessage('');
    setErrorMessage('');
  };

  const handleUpdateHorario = (dayKey: DayKey, updates: Partial<DaySchedule>) => {
    setFormData((previous) => ({
      ...previous,
      horarios: {
        ...previous.horarios,
        [dayKey]: {
          ...previous.horarios[dayKey],
          ...updates,
        },
      },
    }));
  };

  const handleToggleDay = (dayKey: DayKey) => {
    const current = formData.horarios[dayKey];
    handleUpdateHorario(dayKey, { enabled: !current.enabled });
  };

  const handleServiceInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData((previous) => ({ ...previous, serviceInput: value }));
  };

  const handleAddService = () => {
    const trimmed = formData.serviceInput.trim();

    if (!trimmed) {
      setErrorMessage('Informe um nome para o serviço antes de adicionar.');
      return;
    }

    if (formData.servicos.some((service) => service.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage('Esse serviço já foi adicionado.');
      return;
    }

    setFormData((previous) => ({
      ...previous,
      servicos: [...previous.servicos, trimmed],
      serviceInput: '',
    }));
    setErrorMessage('');
  };

  const handleServiceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddService();
    }
  };

  const handleRemoveService = (service: string) => {
    setFormData((previous) => ({
      ...previous,
      servicos: previous.servicos.filter((current) => current !== service),
    }));
  };

  const validateCurrentStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      if (!formData.nomeDoNegocio.trim() || formData.nomeDoNegocio.trim().length < 3) {
        setErrorMessage('Informe o nome do negócio com pelo menos 3 caracteres.');
        return false;
      }
    }

    if (stepIndex === 1) {
      if (formData.servicos.length === 0) {
        setErrorMessage('Adicione pelo menos um serviço.');
        return false;
      }
    }

    if (stepIndex === 2) {
      if (activeDaysCount === 0) {
        setErrorMessage('Ative pelo menos um dia de atendimento.');
        return false;
      }
    }

    setErrorMessage('');
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep(currentStep)) {
      setCurrentStep((previous) => Math.min(previous + 1, STEP_TITLES.length - 1));
      resetInfo();
    }
  };

  const handleBack = () => {
    setCurrentStep((previous) => Math.max(previous - 1, 0));
    resetInfo();
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep(currentStep)) {
      return;
    }

    if (!sessionUser) {
      setErrorMessage('Você precisa estar autenticado para concluir o onboarding.');
      return;
    }

    const horariosPayload = mapHorariosToPayload(formData.horarios);

    if (Object.keys(horariosPayload).length === 0) {
      setErrorMessage('Ative pelo menos um dia de atendimento.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        nomeDoNegocio: formData.nomeDoNegocio.trim(),
        servicos: formData.servicos,
        horarios: horariosPayload,
        politicaConfirmacao: formData.politicaConfirmacao,
      };

      await submitOnboarding(payload);
      setInfoMessage('Onboarding concluído com sucesso! Redirecionando para o painel...');
      setTimeout(() => {
        void router.push('/dashboard');
      }, 800);
    } catch (error) {
      const message = normalizeAuthErrorMessage(error, 'Não foi possível salvar o onboarding.');
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="nomeDoNegocio" className="text-sm font-semibold text-gray-700">
                Nome do negócio
              </label>
              <input
                id="nomeDoNegocio"
                name="nomeDoNegocio"
                type="text"
                placeholder="Ex: Studio Beleza Viva"
                value={formData.nomeDoNegocio}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, nomeDoNegocio: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className="text-xs text-gray-500">
                Esse nome será exibido para seus clientes no catálogo e nas notificações.
              </p>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="serviceInput" className="text-sm font-semibold text-gray-700">
                Adicione seus serviços
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="serviceInput"
                  name="serviceInput"
                  type="text"
                  placeholder="Ex: Corte de cabelo, Manicure, Consultoria"
                  value={formData.serviceInput}
                  onChange={handleServiceInputChange}
                  onKeyDown={handleServiceKeyDown}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={handleAddService}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Liste os serviços principais. Você poderá detalhar duração e valores depois.
              </p>
            </div>

            <div className="space-y-3">
              {formData.servicos.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum serviço adicionado até o momento.</p>
              ) : (
                <ul className="flex flex-wrap gap-3">
                  {formData.servicos.map((service) => (
                    <li
                      key={service}
                      className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700"
                    >
                      {service}
                      <button
                        type="button"
                        onClick={() => handleRemoveService(service)}
                        className="text-xs font-semibold uppercase text-blue-500 hover:text-blue-700"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800">Defina os horários de atendimento</h2>
              <p className="text-sm text-gray-500">
                Ative os dias em que você atende e ajuste o intervalo de horário conforme necessário.
              </p>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const schedule = formData.horarios[day.key];
                  return (
                    <div key={day.key} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          id={`day-${day.key}`}
                          type="checkbox"
                          checked={schedule.enabled}
                          onChange={() => handleToggleDay(day.key)}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`day-${day.key}`} className="text-sm font-semibold text-gray-700">
                          {day.label}
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="time"
                          value={schedule.inicio}
                          onChange={(event) => handleUpdateHorario(day.key, { inicio: event.target.value })}
                          disabled={!schedule.enabled}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                        <span className="text-gray-400">até</span>
                        <input
                          type="time"
                          value={schedule.fim}
                          onChange={(event) => handleUpdateHorario(day.key, { fim: event.target.value })}
                          disabled={!schedule.enabled}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800">Confirmação de agendamentos</h2>
              <div className="flex flex-col gap-3 md:flex-row">
                <label className="flex-1 cursor-pointer rounded-xl border border-gray-200 p-4 transition hover:border-blue-400">
                  <input
                    type="radio"
                    name="politicaConfirmacao"
                    value="manual"
                    checked={formData.politicaConfirmacao === 'manual'}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        politicaConfirmacao: event.target.value as 'manual' | 'automatica',
                      }))
                    }
                    className="sr-only"
                  />
                  <span className="space-y-1">
                    <span className="block font-semibold text-gray-800">Confirmação manual</span>
                    <span className="text-sm text-gray-500">
                      Você revisa e confirma cada agendamento antes de a vaga ser reservada.
                    </span>
                  </span>
                </label>

                <label className="flex-1 cursor-pointer rounded-xl border border-gray-200 p-4 transition hover:border-blue-400">
                  <input
                    type="radio"
                    name="politicaConfirmacao"
                    value="automatica"
                    checked={formData.politicaConfirmacao === 'automatica'}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        politicaConfirmacao: event.target.value as 'manual' | 'automatica',
                      }))
                    }
                    className="sr-only"
                  />
                  <span className="space-y-1">
                    <span className="block font-semibold text-gray-800">Confirmação automática</span>
                    <span className="text-sm text-gray-500">
                      Todos os agendamentos são confirmados na hora, sem necessidade de revisão manual.
                    </span>
                  </span>
                </label>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                <p>
                  <strong>Resumo:</strong> {formData.nomeDoNegocio || 'Nome do negócio não informado'}
                </p>
                <p>
                  <strong>Serviços:</strong>{' '}
                  {formData.servicos.length > 0 ? formData.servicos.join(', ') : 'Nenhum serviço adicionado'}
                </p>
                <p>
                  <strong>Dias ativos:</strong>{' '}
                  {activeDaysCount > 0
                    ? DAYS_OF_WEEK.filter((day) => formData.horarios[day.key].enabled)
                        .map((day) => day.label.split('-')[0])
                        .join(', ')
                    : 'Nenhum'}
                </p>
                <p>
                  <strong>Política:</strong>{' '}
                  {formData.politicaConfirmacao === 'manual'
                    ? 'Confirmação manual'
                    : 'Confirmação automática'}
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isSessionLoading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="rounded-xl bg-white px-6 py-5 shadow">
          <p className="text-gray-600">Preparando seu onboarding...</p>
        </div>
      </main>
    );
  }

  if (!sessionUser) {
    return (
      <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Faça login para continuar</h1>
          <p className="text-sm text-gray-600">
            Precisamos confirmar sua sessão antes de exibir o assistente de onboarding.
          </p>
          <Link
            href="/login?redirect=/onboarding"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
          >
            Ir para a tela de login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Onboarding | Agenda Facil</title>
      </Head>
      <main className="bg-gray-100 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-xl">
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Onboarding
              </p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Vamos configurar o seu negócio em poucos passos
              </h1>
            </div>
            <span className="text-sm text-gray-500">
              Passo {currentStep + 1} de {STEP_TITLES.length}
            </span>
          </header>

          <nav className="mt-6 flex gap-3">
            {STEP_TITLES.map((title, index) => (
              <div key={title} className="flex-1">
                <div className={`h-2 rounded-full ${index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <p
                  className={`mt-2 text-xs font-semibold uppercase tracking-wide ${
                    index === currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {title}
                </p>
              </div>
            ))}
          </nav>

          <section className="mt-6 space-y-4">
            {errorMessage && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}
            {infoMessage && !errorMessage && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-600">
                {infoMessage}
              </div>
            )}
          </section>

          <section className="mt-6">{renderStepContent()}</section>

          <footer className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0 || isSubmitting}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Voltar
            </button>

            <div className="flex flex-1 justify-end gap-3">
              {currentStep < STEP_TITLES.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Avançar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {isSubmitting ? 'Salvando...' : 'Concluir onboarding'}
                </button>
              )}
            </div>
          </footer>
        </div>
      </main>
    </>
  );
};

export default OnboardingPage;
