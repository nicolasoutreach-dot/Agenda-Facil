import React from 'react';

/**
 * Componente ServicesIcon
 * 
 * Exibe o ícone de serviços, geralmente usado no Dashboard para a visualização de serviços.
 * Utiliza SVG inline para facilidade de estilização via classes Tailwind CSS.
 * 
 * SVG base (do agendafacil.pdf): 
 * <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" 
 * stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
 * d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
 */
const ServicesIcon = (props) => {
    
    // Classes padrão (h-6 w-6 mr-3) são consistentes com os outros ícones de navegação
    const defaultClasses = "h-6 w-6 mr-3";
    
    // Renderiza o SVG como JSX
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            // Permite override ou adição de classes de estilo (Tailwind CSS)
            className={`${defaultClasses} ${props.className || ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            {...props} // Permite passar outras props (como onClick, aria-label, etc.)
        >
            <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
            />
        </svg>
    );
};

export default ServicesIcon;
