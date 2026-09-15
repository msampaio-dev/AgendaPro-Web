# AgendaPro Web

Frontend em React e TypeScript para o sistema AgendaPro. Consome a API Spring Boot pela URL configurada em `VITE_API_URL` ou, por padrão, em `http://localhost:8080/api/v1`.

## Executar localmente

```bash
npm install
npm run dev
```

## Testes

Os testes de componentes usam Vitest, Testing Library e JSDOM. Eles validam as decisões da interface com respostas controladas da API, sem acessar o banco real.

```bash
npm run test
```

Os testes ponta a ponta usam Playwright e executam o fluxo completo de login e agendamento em navegador desktop e celular. A API é simulada dentro do navegador para o teste ser determinístico e não criar registros reais.

```bash
npx playwright install chromium
npm run test:e2e
```

Antes de enviar uma alteração, execute toda a verificação:

```bash
npm run test:all
```

Esse comando executa lint, testes de componentes, testes ponta a ponta e build de produção.
