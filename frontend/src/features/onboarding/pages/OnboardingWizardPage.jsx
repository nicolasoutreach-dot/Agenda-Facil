import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { normalizeAuthErrorMessage } from '../../auth/utils.js';
import { submitOnboarding } from '../../auth/authAPI.js';

const DAYS_OF_WEEK = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const DEFAULT_TIME_RANGE = { inicio: '09:00', fim: '18:00' };

function createDefaultHorarios(existing = {}) {
  return DAYS_OF_WEEK.reduce((accumulator, day) => {
    const entry = existing?.[day.key];
    if (entry && entry.inicio && entry.fim) {
      accumulator[day.key] = {
        enabled: true,
        inicio: entry.inicio,
        fim: entry.fim,
      };
    } else {
      accumulator[day.key] = {
        enabled: false,
        inicio: DEFAULT_TIME_RANGE.inicio,
        fim: DEFAULT_TIME_RANGE.fim,
      };
    }
    return accumulator;
  }, {});
}

const STEP_TITLES = ['Sobre seu negócio', 'Serviços oferecidos', 'Agenda e confirmação'];

const OnboardingWizardPage = () => {
  const navigate = useNavigate();
  const { user, isLoading, login, accessToken, refreshSession } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    nomeDoNegocio: '',
    servicos: [],
    serviceInput: '',
    horarios: createDefaultHorarios(),
    politicaConfirmacao: 'manual',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.onboardingIncompleto === false) {
      navigate('/dashboard', { replace: true });
      return;
    }

    setFormData((previous) => ({
      nomeDoNegocio: previous.nomeDoNegocio || user.nomeDoNegocio || '',
      servicos: previous.servicos.length > 0 ? previous.servicos : user.servicos ?? [],
      serviceInput: '',
      horarios: createDefaultHorarios(user.horarios),
      politicaConfirmacao: user.politicaConfirmacao ?? 'manual',
    }));
  }, [user, navigate]);

  const activeDaysCount = useMemo(
    () =>
      Object.values(formData.horarios).filter((entry) => entry.enabled).length,
    [formData.horarios],
  );

  const handleUpdateHorario = (dayKey, updates) => {
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

  const handleRemoveService = (service) => {
    setFormData((previous) => ({
      ...previous,
      servicos: previous.servicos.filter((current) => current !== service),
    }));
  };

  const validateCurrentStep = () => {
    if (currentStep === 0) {
      if (!formData.nomeDoNegocio || formData.nomeDoNegocio.trim().length < 3) {
        setErrorMessage('Informe o nome do negócio com pelo menos 3 caracteres.');
        return false;
      }
      return true;
    }

    if (currentStep === 1) {
      if (formData.servicos.length === 0) {
        setErrorMessage('Adicione pelo menos um serviço oferecido.');
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (activeDaysCount === 0) {
        setErrorMessage('Selecione ao menos um dia de atendimento.');
        return false;
      }

      for (const [dayKey, entry] of Object.entries(formData.horarios)) {
        if (!entry.enabled) {
          continue;
        }

        if (!entry.inicio || !entry.fim) {
          setErrorMessage(`Preencha os horários de ${dayKey}.`);
          return false;
        }

        if (entry.fim <= entry.inicio) {
          setErrorMessage('O horário final deve ser maior que o horário inicial.');
          return false;
        }
      }

      return true;
    }

    return true;
  };

  const handleNext = () => {
    setErrorMessage('');
    setInfoMessage('');

    if (!validateCurrentStep()) {
      return;
    }

    setCurrentStep((previous) => Math.min(previous + 1, STEP_TITLES.length - 1));
  };

  const handleBack = () => {
    setErrorMessage('');
    setInfoMessage('');
    setCurrentStep((previous) => Math.max(previous - 1, 0));
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setInfoMessage('');

    if (!validateCurrentStep()) {
      return;
    }

    const horariosPayload = Object.entries(formData.horarios).reduce((accumulator, [dayKey, entry]) => {
      if (!entry.enabled) {
        return accumulator;
      }

      accumulator[dayKey] = {
        inicio: entry.inicio,
        fim: entry.fim,
      };

      return accumulator;
    }, {});

    if (Object.keys(horariosPayload).length === 0) {
      setErrorMessage('Selecione ao menos um dia de atendimento.');
      return;
    }

    const payload = {
      nomeDoNegocio: formData.nomeDoNegocio.trim(),
      servicos: formData.servicos,
      horarios: horariosPayload,
      politicaConfirmacao: formData.politicaConfirmacao,
    };

    setIsSubmitting(true);

    try {
      const response = await submitOnboarding(payload);

      await login(response?.user ?? null, { accessToken });
      await refreshSession();
      setInfoMessage('Onboarding concluído com sucesso! Redirecionando para o painel...');

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 600);
    } catch (error) {
      setErrorMessage(
        normalizeAuthErrorMessage(
          error,
          'Não foi possível concluir o onboarding. Tente novamente em instantes.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-gray-600">
              Comece informando o nome que será exibido para os seus clientes e canais de agendamento.
            </p>
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Nome do negócio</span>
              <input
                type="text"
                value={formData.nomeDoNegocio}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    nomeDoNegocio: event.target.value,
                  }))
                }
                placeholder="Ex.: Studio Bella Hair"
                className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </label>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <p className="text-gray-600">
              Liste os principais serviços oferecidos. Isso ajuda seus clientes a escolherem o atendimento ideal.
            </p>
            <div>
              <span className="text-sm font-semibold text-gray-700">Serviços oferecidos</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.servicos.map((service) => (
                  <span
                    key={service}
                    className="inline-flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                  >
                    {service}
                    <button
                      type="button"
                      className="ml-2 text-blue-500 hover:text-blue-700"
                      onClick={() => handleRemoveService(service)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.servicos.length === 0 && (
                  <span className="text-sm text-gray-400">Nenhum serviço adicionado até o momento.</span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={formData.serviceInput}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    serviceInput: event.target.value,
                  }))
                }
                placeholder="Ex.: Corte feminino, Manicure, Massagem..."
                className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddService();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddService}
                className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Adicionar
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-gray-600 mb-3">
                Defina os dias e horários em que você atende. Você pode ajustar depois sempre que precisar.
              </p>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const entry = formData.horarios[day.key];
                  return (
                    <div
                      key={day.key}
                      className="flex flex-col sm:flex-row sm:items-center sm:gap-4 p-3 border rounded-lg bg-white shadow-sm"
                    >
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          onChange={(event) =>
                            handleUpdateHorario(day.key, { enabled: event.target.checked })
                          }
                        />
                        {day.label}
                      </label>
                      <div className="mt-2 sm:mt-0 flex items-center gap-3">
                        <input
                          type="time"
                          value={entry.inicio}
                          disabled={!entry.enabled}
                          onChange={(event) =>
                            handleUpdateHorario(day.key, { inicio: event.target.value })
                          }
                          className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100"
                        />
                        <span className="text-gray-500 text-sm">até</span>
                        <input
                          type="time"
                          value={entry.fim}
                          disabled={!entry.enabled}
                          onChange={(event) => handleUpdateHorario(day.key, { fim: event.target.value })}
                          className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-sm font-semibold text-gray-700">Política de confirmação</span>
              <p className="text-gray-500 text-sm">
                Escolha como você prefere confirmar novos agendamentos.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="border rounded-lg p-4 flex items-start gap-3 cursor-pointer hover:border-blue-400 transition">
                  <input
                    type="radio"
                    name="politica-confirmacao"
                    className="mt-1"
                    value="manual"
                    checked={formData.politicaConfirmacao === 'manual'}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        politicaConfirmacao: event.target.value,
                      }))
                    }
                  />
                  <span>
                    <span className="block font-semibold text-gray-800">Confirmação manual</span>
                    <span className="text-sm text-gray-500">
                      Você aprova cada novo agendamento antes de confirmar com o cliente.
                    </span>
                  </span>
                </label>

                <label className="border rounded-lg p-4 flex items-start gap-3 cursor-pointer hover:border-blue-400 transition">
                  <input
                    type="radio"
                    name="politica-confirmacao"
                    className="mt-1"
                    value="automatica"
                    checked={formData.politicaConfirmacao === 'automatica'}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        politicaConfirmacao: event.target.value,
                      }))
                    }
                  />
                  <span>
                    <span className="block font-semibold text-gray-800">Confirmação automática</span>
                    <span className="text-sm text-gray-500">
                      Os agendamentos são confirmados automaticamente assim que criados.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Resumo rápido
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <strong>Negócio:</strong> {formData.nomeDoNegocio || 'Não informado'}
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
                  {formData.politicaConfirmacao === 'manual' ? 'Confirmação manual' : 'Confirmação automática'}
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Onboarding</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              Vamos configurar seu negócio em poucos passos
            </h1>
          </div>
          <span className="text-sm text-gray-500">
            Passo {currentStep + 1} de {STEP_TITLES.length}
          </span>
        </div>

        <div className="flex gap-3 mb-8">
          {STEP_TITLES.map((title, index) => (
            <div key={title} className="flex-1">
              <div
                className={`h-2 rounded-full ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
              <p
                className={`mt-2 text-xs font-semibold uppercase tracking-wide ${
                  index === currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {title}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}
          {infoMessage && !errorMessage && (
            <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm">
              {infoMessage}
            </div>
          )}
        </div>

        <div className="mt-6">{renderStepContent()}</div>

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            className="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Voltar
          </button>
          {currentStep < STEP_TITLES.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
            >
              Avançar
            </button>
          )}
          {currentStep === STEP_TITLES.length - 1 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60 transition"
            >
              {isSubmitting ? 'Salvando...' : 'Concluir onboarding'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizardPage;
