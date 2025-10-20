import React from 'react';

/**
 * Componente StarIcon
 * 
 * Exibe o ícone de estrela (representando qualidade ou profissionalismo). 
 * Utiliza SVG inline para que o estilo (Tailwind CSS) possa ser aplicado facilmente.
 * 
 * SVG base e classes de estilo retiradas da definição original (agendafacil.pdf).
 */
const StarIcon = (props) => {
    
    // Classes padrão para Landing Page: h-10 w-10 text-blue-600 mb-4 [5]
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
            {...props} // Permite passar outras propriedades SVG
        >
            <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
            />
        </svg>
    );
};

export default StarIcon;
