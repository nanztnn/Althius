---
title: "O selo do Agente não diz Disponível quando as Conversas estão indisponíveis"
status: ready-for-human
depends_on: []
---

# 03: O selo do Agente não diz "Disponível" quando as Conversas estão indisponíveis

Spec: [../spec.md](../spec.md) (US 1, 5).

**What to build:** na página de Agentes, na página do Agente e na barra lateral da Casca, um Agente ocioso aparece como "Disponível" só quando as Conversas estão disponíveis. Com o módulo indisponível, o selo diz "Sem conversas no momento". Os estados "Trabalhando" e "Detectou" não mudam.

**GATE:** só frontend; sem deploy; pt-BR; só ícones `lucide-react` existentes.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

**Quem faz:** agente de código. **Esforço:** P.

## Pode mexer

- `projeto-althius-frontend/src/components/marca.tsx` (`SeloDeEstado`, `ROTULO_DO_ESTADO`)
- `projeto-althius-frontend/src/paginas/agentes.tsx`, `paginas/agente.tsx`, `components/casca.tsx` (passar a disponibilidade)
- testes Vitest novos; nos existentes (`agentes-reais.test.tsx` e afins), só asserções de "Disponível" que dependam do módulo

## Não mexa

- `fonte/composicao.ts`, `fonte/supabase-conversas.ts`, `auth/aplicativo.tsx` (são do ticket 02)

## Critérios

- [x] Conversas indisponíveis: nenhum selo diz "Disponível"; o ocioso diz "Sem conversas no momento"
- [x] Conversas disponíveis: selo igual a hoje
- [x] A Demonstração não muda
- [x] Prints 1400×900 da página de Agentes nos dois casos em `issues/prints/03-*.jpg`
- [x] lint, `tsc -b` e vitest verdes

## Como testar

- `npx vitest run --maxWorkers=2 src/paginas/agentes src/components`

## Evidência (auditoria, vertical B)

- `components/marca.tsx:90-91`: `ocioso: 'Disponível'`, estado de runtime lido do banco.
- `paginas/agentes.tsx:53`: o aviso usa `disponivel('conversas')`; `agentes.tsx:134` usa `SeloDeEstado` sem olhar o módulo.

## Comments

### 2026-10-17 — Implementação

**Problema:** a grade de Agentes avisava "Conversas … indisponíveis" e, no mesmo cartão, o selo do ocioso dizia "Disponível".

**Correção:**
- `rotuloDoEstado(estado, conversasDisponiveis)` — ocioso + módulo off → "Sem conversas no momento"; Trabalhando/Detectou iguais.
- `SeloDeEstado` aceita `conversasDisponiveis` (default `true` → Demonstração e usos legados intactos).
- `agentes.tsx`, `agente.tsx` e `casca.tsx` passam `disponivel('conversas')`.

**Evidência:** `agentes-reais.test.tsx` (indisponível + disponível); `App.test.tsx` Demonstração ainda com "Disponível"; suíte 1399 passed | 4 skipped; `tsc -b` 0.
Prints esquemáticos 1400×900 em `issues/prints/03-agentes-conversas-{indisponiveis,disponiveis}.jpg` (rótulos dos dois casos).
