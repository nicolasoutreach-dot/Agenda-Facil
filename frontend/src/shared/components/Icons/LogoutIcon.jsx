import React from 'react';

/**
 * Componente LogoutIcon
 * 
 * Exibe o ícone de logout (saída da sessão). 
 * Utiliza SVG inline para que as classes de estilo (Tailwind CSS) possam ser aplicadas facilmente.
 * 
 * SVG base (originalmente no agendafacil.pdf):
 * <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" 
 * stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
 * d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
 */
const LogoutIcon = (props) => {
    
    // Classes padrão definidas no Dashboard para navegação (Fontes –)
    const defaultClasses = "h-6 w-6 mr-3";
    
    // O SVG é renderizado como JSX
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            // Combina classes padrão com classes personalizadas passadas via props
            className={`${defaultClasses} ${props.className || ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            {...props} // Permite passar props adicionais como custom styles
        >
            <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
            />
        </svg>
    );
};

export default LogoutIcon;
