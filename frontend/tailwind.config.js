// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  // O campo 'content' é crucial para o tree-shaking do Tailwind e otimização de desempenho.
  // Ele informa ao framework quais arquivos escanear para extrair as classes usadas.
  content: [
    "./index.html",
    // Escaneia todos os arquivos JS, JSX, TS e TSX dentro do diretório src/
    "./src/**/*.{js,jsx,ts,tsx}", 
  ],
  theme: {
    extend: {
      // Definição da paleta de cores para consistência da marca
      colors: {
        // Cores primárias e secundárias que facilitam o desenvolvimento modular
        'primary': '#007BFF', // Azul Principal, similar ao Indigo 600 recomendado
        'secondary': '#6C757D', // Cinza para elementos de suporte
        'accent-blue': '#1D4ED8', // Azul de destaque (ex: foco, botões de ação)
      },
      // Definição da família de fontes
      fontFamily: {
        // Uso de fontes sem serifa modernas, como Poppins, para clareza e UX
        sans: ['Poppins', 'sans-serif'], 
      },
      // Sombras personalizadas para profundidade visual
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      }
    },
  },

  plugins: [
    // Inclusão do plugin @tailwindcss/forms para padronizar formulários.
    // Garante que elementos de formulário nativos (inputs, selects) sejam consistentes e responsivos.
    require('@tailwindcss/forms'), 
  ],
}
