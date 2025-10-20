import React from 'react';

/**
 * Componente Footer (Rodapé)
 * 
 * Exibe informações de copyright e links legais/de contato.
 * Não requer props nem gerenciamento de estado complexo.
 */
const Footer = () => {
    
    // As classes CSS são utilitárias (Tailwind CSS) para estilo consistente.
    return (
        <footer className="bg-gray-800 text-white py-8 mt-16">
            <div className="container mx-auto px-6 text-center">
                
                {/* Links Secundários */}
                <div className="flex justify-center space-x-6 mb-4">
                    
                    {/* Estes links usam classes de transição para uma UX suave */}
                    <a 
                        href="/contato" 
                        className="hover:text-blue-400 transition duration-300"
                    >
                        Contato
                    </a>
                    
                    <a 
                        href="/termos" 
                        className="hover:text-blue-400 transition duration-300"
                    >
                        Termos de Serviço
                    </a>
                </div>
                
                {/* Informação de Copyright */}
                <p>
                    &copy; {new Date().getFullYear()} Agenda Fácil. Todos os direitos reservados.
                </p>
                
            </div>
        </footer>
    );
};

export default Footer;