import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { registerUser } from '../authAPI.js';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await registerUser(formData);
      setSuccessMessage(result.message ?? 'Conta criada com sucesso!');
    } catch (registrationError) {
      setError(
        registrationError?.response?.data?.message ??
          registrationError.message ??
          'Falha ao registrar. Tente novamente.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">Crie sua conta</h1>
        <p className="text-center text-gray-500 mb-8">
          Registre-se para acessar o painel do profissional.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Nome completo"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Seu e-mail"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Crie uma senha"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            minLength={6}
            required
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? 'Registrando...' : 'Registrar'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Já possui uma conta?
          <Link to="/login" className="text-blue-600 font-semibold ml-1 hover:underline">
            Faça login
          </Link>
        </p>

        <p className="text-center mt-2 text-sm">
          <Link to="/" className="text-gray-500 hover:underline">
            Voltar para o site
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
