import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { mockServicesData } from '../dashboard/mockData.js';

const PublicBookingPage = () => {
  const [selectedService, setSelectedService] = useState(mockServicesData[0]?.id ?? null);
  const [selectedSlot, setSelectedSlot] = useState('');

  const availableSlots = useMemo(
    () => [
      '09:00',
      '10:30',
      '11:15',
      '14:00',
      '15:30',
      '17:00',
    ],
    [],
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedService || !selectedSlot) {
      return;
    }
    // Placeholder para integração futura
    alert(
      `Agendamento solicitado para ${
        mockServicesData.find((service) => service.id === selectedService)?.name ?? 'serviço'
      } às ${selectedSlot}`,
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-2xl p-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Agende seu horário</h1>
          <p className="text-gray-500 mt-2">
            Escolha o serviço e o horário que melhor se encaixa na sua agenda.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="service" className="block text-sm font-semibold text-gray-700 mb-2">
              Serviço
            </label>
            <select
              id="service"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedService ?? ''}
              onChange={(event) => setSelectedService(event.target.value)}
            >
              <option value="">Selecione um serviço</option>
              {mockServicesData.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ·{' '}
                  {service.price.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="block text-sm font-semibold text-gray-700 mb-2">Horário disponível</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`border rounded-lg px-4 py-2 text-center transition ${
                    selectedSlot === slot
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:border-blue-600'
                  }`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
            disabled={!selectedService || !selectedSlot}
          >
            Confirmar agendamento
          </button>
        </form>

        <footer className="mt-8 text-center text-sm text-gray-500">
          Já é profissional parceiro?
          <Link to="/login" className="text-blue-600 font-semibold ml-1 hover:underline">
            Acesse seu painel
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default PublicBookingPage;
