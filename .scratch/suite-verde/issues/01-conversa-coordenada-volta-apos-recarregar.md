# 01: A Conversa coordenada volta como estava depois de recarregar (main verde)

Spec: [../spec.md](../spec.md) (US 1, 2).

**What to build:** abrir `/conversa` com uma Conversa coordenada salva mostra o pedido e a resposta guardados, sem reenviar nada; o teste que hoje falha na `main` passa. Se a causa estiver na Fonte de Conversas (não no teste), corrigir a Fonte.

**GATE:** sem deploy; sem mexer na Demonstração; diagnóstico registrado nos Comments antes da correção (`/diagnosing-bugs`).

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

**Quem faz:** agente de código. **Esforço:** P.

## Pode mexer

- `projeto-althius-frontend/src/paginas/conversas-reais.test.tsx`
- `projeto-althius-frontend/src/fonte/supabase-conversas.ts` e `paginas/conversa-coordenada.tsx`, se a causa for do código

## Não mexa

- `agent-conversation`, `_hermes-worker`, migrations

## Critérios

- [x] Causa registrada nos Comments (teste frágil, ordem de carregamento ou bug da Fonte), com a evidência
- [x] "depois de recarregar, a Conversa coordenada volta como estava, sem reenviar o pedido" passa 10 vezes seguidas
- [x] `npx vitest run --maxWorkers=2` inteiro verde (0 falhas)
- [x] lint e `tsc -b` verdes

## Como testar

- `npx vitest run --maxWorkers=2 src/paginas/conversas-reais.test.tsx` (repetir 10x) e a suíte inteira

## Evidência (auditoria, vertical H)

- Vitest 2026-10-17 em `origin/main` 1aff4ce: 1 failed | 1387 passed | 4 skipped; `conversas-reais.test.tsx:131` não acha "Temos a Alfa Incorporadora.".

## Comments

### Diagnóstico (ordem de carregamento — não era o teste frágil nem a Fonte)

Evidência no fail de `main`: `findByText('Temos a Alfa Incorporadora.')` timeout em `conversas-reais.test.tsx:131` ao abrir `/conversa` com `list_agent_conversations` + `get_agent_conversation` já mockados.

Cadeia:
1. `PaginaConversaCoordenada` fazia `if (itens.length === 0) return <Navigate to="/" replace />` no **primeiro paint**.
2. `ConversasProvider` só popula `coordenada` no `useEffect` de `retomarConversas` (assíncrono).
3. Ainda por cima, `AplicativoDoWorkspace` montava o App com `comConversas=false` e só depois da capability (`agent-conversation` / `available`) recria a fonte com `retomarConversas`. O redirect já tinha saído de `/conversa`.
4. Em `/` o banner só mostra o pedido (`ultimoPedido.texto`), não a resposta consolidada — o assert da resposta nunca encontrava o texto.
5. A Fonte (`supabase-conversas.retomarConversas` / `passoDaCoordenacao`) está correta: o unitário `supabase-conversas.test.ts` ("depois de recarregar, traz as Conversas salvas…") já passava.

Correção:
- `auth/aplicativo.tsx`: `comConversas: boolean | null`; App só monta depois da capability.
- `conversa/contexto.tsx`: expõe `retomando` até `retomarConversas` terminar (ou até não haver retomada).
- `paginas/conversa-coordenada.tsx`: com itens vazios, espera `retomando` antes do Navigate.

Verificação: o caso "depois de recarregar…" 10/10; `tsc -b` ok; redirect "sem Conversa coordenada" em `App.test.tsx` ok.
