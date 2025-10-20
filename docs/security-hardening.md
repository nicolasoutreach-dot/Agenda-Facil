## Validações e proteção de entrada

- Validação centralizada com **Zod** (`src/validation/index.js`), utilizando objetos estritos para bloquear campos inesperados e mensagens amigáveis para os usuários.
- Dados normalizados automaticamente: `trim`, normalização de e-mail para minúsculas e sanitização com `sanitize-html`, impedindo HTML/script injection antes de qualquer regra de negócio.
- Middleware reutilizável (`createValidationMiddleware`) aplicado diretamente nas rotas para garantir que apenas payloads válidos cheguem aos controllers.
- Limites de tamanho por campo (nome, e-mail, senha, tokens, URLs) e configuração `REQUEST_BODY_LIMIT`/`URL_ENCODED_PARAMETER_LIMIT` para evitar sobrecarga do servidor.
- Tokens e filtros vindos do usuário são restritos a caracteres seguros, reduzindo o risco de injeções.
- Erros de validação retornam resposta `400` padronizada (`message` + `details`), sem expor stack traces.

## Testes de fluxos maliciosos

- Casos cobrindo HTML injection, campos extras e tokens malformados em `tests/security.validation.test.js`.
- Cenário de payload acima do limite para assegurar resposta `413 Payload Too Large`.
- Testes garantem que strings são normalizadas (trim/lowercase) antes da persistência.

## Ajustes operacionais

- `REQUEST_BODY_LIMIT` padrão de `64kb` exposto em `.env.example`.
- `app.js` com `express.json`/`express.urlencoded` configurados para limites e `x-powered-by` desabilitado.
- Handler de erros centralizado envia mensagens genéricas para falhas 500, preservando logs no servidor.
