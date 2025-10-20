import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => (
  <header className="bg-white shadow-md">
    <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold text-gray-800 hover:text-indigo-600">
        Agenda Facil
      </Link>

      <div className="flex items-center space-x-8">
        <a
          href="#funcionalidades"
          className="text-gray-600 hover:text-blue-600 font-medium transition duration-300"
        >
          Funcionalidades
        </a>
        <a
          href="#precos"
          className="text-gray-600 hover:text-blue-600 font-medium transition duration-300"
        >
          Preços
        </a>
        <Link
          to="/login"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 shadow-sm"
        >
          Login
        </Link>
      </div>
    </nav>
  </header>
);

export default Header;
