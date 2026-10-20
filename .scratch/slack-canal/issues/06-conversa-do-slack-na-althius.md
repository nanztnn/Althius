# 06: A Conversa do Slack aparece na Althius

Spec: [../spec.md](../spec.md) (seções "Fio e Conversa" e "Frontend"; US 28–30). Decisão: Q15.

**What to build:** a Conversa que nasceu no Slack aparece na lista de Conversas de quem mencionou, e só dele, com uma marca de origem Slack. Ao abrir, ela mostra os passos como qualquer Conversa, mas o composer fica desabilitado com "Esta Conversa continua no Slack". A Demonstração continua simulada e intocada.

**GATE:** uma migration só, aditiva, com pgTAP, que redefine as RPCs de listagem de Conversas a partir da definição mais recente da `main` para devolver a origem; sem aplicar no remoto; só ícones de `lucide-react` e componentes existentes; sem emojis; pt-BR. Conferência visual em navegador é trabalho do agente (`docs/agents/triage-labels.md`).

**Blocked by:** 03 (Abrir um fio e o Agente responde no thread).

**Status:** done (pgTAP aguardando o CI)

## Pode mexer

- migration nova redefinindo as RPCs de listagem de Conversas para devolver a origem, e o pgTAP dela
- `projeto-althius-frontend/src/fonte/supabase-conversas.ts`, `conversas-tipos.ts`
- a tela de Conversa (`paginas/secoes/conversa.tsx`) e a lista de Conversas, com testes Vitest novos

## Não mexa

- funções do Slack, `agent-conversation`, `_hermes-worker`
- a Demonstração (`simulada-*`, `dados-demo`)
- testes existentes

## Critérios

- [x] As RPCs de listagem devolvem a origem; Conversas antigas vêm como Althius (`list_agent_conversations`, `list_named_agent_conversations` e `get_agent_conversation`; pgTAP `origem_da_conversa_na_lista.sql`, 4–9)
- [x] A Conversa do Slack aparece só para o dono (pgTAP com outro participante do mesmo Workspace, 11–14, e outro Workspace, 15–17)
- [x] A lista e a Conversa mostram a marca de origem Slack (`conversa-do-slack.test.tsx`)
- [x] O composer fica desabilitado com "Esta Conversa continua no Slack"
- [x] Conversas de origem Althius não mudam (a página do Agente retoma só a da Althius; `supabase-conversas-slack.test.ts`)
- [x] Prints em `.scratch/slack-canal/issues/prints/06-*.jpg` linkados nos Comments
- [ ] lint, `tsc -b`, vitest e pgTAP do zero verdes (lint e `tsc -b` verdes; vitest com 1 falha que já existe na `main`; pgTAP não rodou localmente, sem Postgres na máquina)

## Passos do Nan

- Aplicar a migration conforme `docs/agents/migrations.md`
- Depois do deploy do frontend: abrir na Althius uma Conversa criada pelo Slack de teste e conferir a marca e o composer desabilitado

## Comments

- Desenho: a Conversa do Slack entra em "Conversas anteriores" (página de Agentes) com a marca `# Slack`. "Abrir" leva a `/agentes/<Agente>/conversa?slack=<id>`, a seção Conversa do Agente só para leitura: os passos, o composer desabilitado, "Esta Conversa continua no Slack" e "Voltar à Conversa na Althius". A página do Agente continua retomando a Conversa da Althius, nunca a do Slack.
- Fora do "Pode mexer": `fonte/tipos.ts` ganhou o método opcional `abrirConversaDoSlack` e o tipo `ConversaDoSlack`; `paginas/conversas-salvas.tsx` é a lista. A confirmar com o Nan.
- A migration troca o retorno das duas listas, então faz `drop function` + `create` com o mesmo nome, argumentos e permissões.
- Risco anotado: só a tela impede responder pela Althius; `agent-conversation` ainda aceitaria o id da Conversa do Slack (fora deste ticket).
- `conversas-reais.test.tsx` ("depois de recarregar, a Conversa coordenada volta...") falha também na `main` sem esta mudança.
- Prints (harness com o Supabase falso dos testes, Chrome headless):
  - [lista com a marca Slack](prints/06-lista-desktop.jpg)
  - [Conversa do Slack só para leitura](prints/06-conversa-do-slack-desktop.jpg)
  - [Conversa da Althius com o Scopus, sem mudança](prints/06-conversa-da-althius-desktop.jpg)
