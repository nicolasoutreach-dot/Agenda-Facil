import React from 'react';

/**
 * Componente ClockIcon
 * 
 * Exibe o ícone de relógio (tempo/duração). 
 * Utiliza SVG inline para facilidade de estilização via classes do Tailwind CSS.
 * 
 * Estrutura SVG original (agendafacil.pdf) [2]:
 * <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600 mb-4" 
 * fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 * <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
 */
const ClockIcon = (props) => {
    // Definimos classes padrão, mas permitimos que classes personalizadas sejam passadas 
    // para aumentar a flexibilidade (composição, RN01)
    const defaultClasses = "h-10 w-10 text-blue-600 mb-4";
    
    // Classes de utilidade (Tailwind CSS) são usadas para estilização [3, 4]
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`${defaultClasses} ${props.className || ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
            // Propriedades SVG adicionais podem ser passadas via props
            {...props} 
        >
            <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
        </svg>
    );
};

export default ClockIcon;
