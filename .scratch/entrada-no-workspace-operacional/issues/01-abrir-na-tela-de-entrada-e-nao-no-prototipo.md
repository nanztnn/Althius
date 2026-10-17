---
title: "Abrir na tela de entrada e não no protótipo"
status: ready-for-human
depends_on: []
---

# Abrir na tela de entrada e não no protótipo

## What to do

No build de produção, a primeira visita (sem escolha salva neste navegador) abre a **tela de entrada** do Workspace operacional — e-mail, senha, "Criar conta", "Esqueci a senha" e o link "Ver a Demonstração" — e **não** a Demonstração com o banner "Modo Protótipo (Completo)".

O build de **desenvolvimento** mantém o comportamento de hoje: a Demonstração é o padrão e o banner do protótipo continua (atalho para quem está implementando).

A escolha consciente continua valendo:

- `?demo=true` e o link "Ver a Demonstração" abrem a Demonstração
- `?auth=true`, `?demo=false` e as telas de acesso (`/entrar`, `/criar-conta`, …) abrem o operacional
- a escolha fica lembrada neste navegador (chave nova, ver abaixo)

O valor antigo `localStorage['althius:modo_demo'] === 'true'` **não** conta como escolha em produção: a chave muda de nome (ou o default de produção deixa de ler o `true` legado) para o `true` que o protótipo gravava não prender o Cliente na Demonstração. A chave antiga some do navegador na primeira abertura em produção.

A Demonstração em si (visitante sem Contrato, "Você está vendo uma demonstração", ADR-0025) **não muda** — só o default de quem chega na URL raiz sem ter escolhido nada.

## Acceptance criteria

- [x] Build de produção sem nada salvo abre a tela de entrada, sem o banner "Modo Protótipo (Completo)"
- [x] Build de desenvolvimento mantém o comportamento de hoje (Demonstração padrão, banner do protótipo)
- [x] `?demo=true` e o link "Ver a Demonstração" abrem a Demonstração; `?auth=true`, `?demo=false` e as telas de acesso abrem o operacional, como hoje
- [x] O valor antigo `althius:modo_demo=true` é ignorado em produção (chave nova; a antiga é apagada)
- [x] O visitante sem Contrato continua vendo a Demonstração com "Você está vendo uma demonstração" (ADR-0025), sem regressão
- [x] `npm run lint`, `npx tsc -b` e `npx vitest run --maxWorkers=2` passam

## Context

- Spec: `.scratch/entrada-no-workspace-operacional/spec.md` — "O que muda no produto"
- ADR-0020 (Demonstração × real), ADR-0025 (visitante e Contrato)
- Código: `src/raiz.tsx` (`ambienteInicial` / `localStorage` `althius:modo_demo`), `src/auth/tela-de-entrada.tsx` (link da Demonstração)
- Testes: `src/raiz.test.tsx` — "Alternar entre Demonstração e o Workspace operacional"; o default de produção precisa de caso novo (hoje o padrão implícito nos testes é Demonstração, típico de `import.meta.env.DEV`)

## Non-goals

- Não mudar o conteúdo da Demonstração nem o fluxo do visitante com/sem Contrato.
- Não remover o banner do protótipo no build de desenvolvimento.
- Não mexer em auth, convites, capabilities ou fontes.
- Sem migration, sem deploy.

## Comments

### 2026-10-17 — Implementação

**Causa do default errado em produção:** `ambienteInicial` caía em `demonstracao` quando não havia `?demo`/`?auth`/caminho de acesso e a chave antiga `althius:modo_demo` não estava `false`. O protótipo gravava `true`, então quem já tinha aberto a demo ficava preso nela — e o default implícito era Demonstração em qualquer build.

**Correção:**
1. Chave nova `althius:ambiente` (`demonstracao` | `real`). `lembrarAmbiente` grava nela e apaga a antiga.
2. Função pura `ambienteNaAbertura({ busca, caminho, armazenamento, producao })`:
   - query e caminhos de acesso como antes;
   - chave nova se existir;
   - chave antiga: em **produção** é apagada e ignorada; em **desenvolvimento** migra uma vez para a chave nova;
   - default: `producao ? 'real' : 'demonstracao'`.
3. Banner "Modo Protótipo (Completo)" só com `import.meta.env.DEV`.
4. Rótulo do botão na tela de entrada: "Ver a Demonstração".

**Evidência:** `raiz.test.tsx` 147/147 (inclui bloco "Escolha do ambiente na abertura"); suíte completa 1397 passed | 4 skipped; `tsc -b` exit 0.
