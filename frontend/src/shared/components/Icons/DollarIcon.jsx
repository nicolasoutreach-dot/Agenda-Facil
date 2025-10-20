import React from 'react';

/**
 * Componente DollarIcon
 * 
 * Exibe o ícone de cifrão ($), representando benefícios financeiros (faturamento/preços).
 * Utiliza SVG inline para que as classes de estilo (Tailwind CSS) possam ser aplicadas facilmente.
 * 
 * SVG base: 
 * <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600 mb-4" 
 * fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 * <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1h4a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2h4z" /></svg>
 */
const DollarIcon = (props) => {
    
    // Classes padrão definidas na LandingPage (Fontes – [5])
    const defaultClasses = "h-10 w-10 text-blue-600 mb-4";
    
    // O SVG é renderizado como JSX
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            // Combina classes padrão com classes personalizadas passadas via props
            className={`${defaultClasses} ${props.className || ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
            {...props} // Permite passar outras propriedades SVG ou manipuladores de eventos
        >
            <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1h4a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2h4z" 
            />
        </svg>
    );
};

export default DollarIcon;



