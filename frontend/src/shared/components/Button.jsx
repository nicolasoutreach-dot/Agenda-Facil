import React from 'react';

/**
 * Mapeamento de Estilos Baseado em Propriedades (Props)
 * 
 * Permite definir estilos primários e secundários de forma centralizada, 
 * promovendo a reutilização e consistência.
 * 
 * A estilização usa classes Utility-First (Tailwind CSS).
 */
const variantStyles = {
    // Estilo principal: Usado para ações de destaque (ex: Login, Confirmar Agendamento)
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
    
    // Estilo secundário: Usado para ações menos prioritárias ou neutras
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300',

    // Estilo perigoso: Usado para ações destrutivas (ex: Excluir/Cancelar)
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
};

/**
 * Componente Button.jsx
 * 
 * Componente funcional reutilizável que aceita diferentes variantes de estilo.
 * 
 * @param {object} props - Propriedades do componente.
 * @param {('primary'|'secondary'|'danger')} props.variant - A variação de estilo do botão.
 * @param {boolean} [props.fullWidth=false] - Se o botão deve ocupar 100% da largura.
 * @param {string} [props.className] - Classes CSS adicionais para override ou customização.
 * @param {React.ReactNode} props.children - O conteúdo exibido dentro do botão.
 * @param {function} props.onClick - Função de callback executada no clique.
 * @param {string} [props.type='button'] - Tipo do botão (submit, button, reset).
 * @param {boolean} [props.disabled=false] - Desabilita o botão.
 */
const Button = ({ 
    variant = 'primary', 
    fullWidth = false, 
    className = '',
    children, 
    onClick, 
    type = 'button',
    disabled = false
}) => {
    
    const baseClasses = `
        font-bold py-3 px-6 rounded-lg 
        transition duration-300 
        focus:outline-none focus:ring-2 focus:ring-opacity-50
        ${fullWidth ? 'w-full' : 'inline-block'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `;

    // Combina as classes base, as classes da variante e quaisquer classes adicionais
    const finalClasses = `${baseClasses} ${variantStyles[variant]} ${className}`;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={finalClasses.trim()}
        >
            {children}
        </button>
    );
};

export default Button;
