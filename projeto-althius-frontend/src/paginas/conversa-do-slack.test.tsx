import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { RaizDoAplicativo } from '@/raiz'
import { criarBancoDeAgentes, rpcsDeAgentes } from '@/test/agentes-no-banco'
import { criarServicosDoNavegadorFalsos } from '@/test/servicos-do-navegador-falsos'
import { criarSupabaseFalso, sessaoDe } from '@/test/supabase-falso'

const MARINA = { id: 'usuario-marina', email: 'marina@cliente.com.br' }
const PESSOAL = { id: 'ws-pessoal-marina', kind: 'pessoal', name: 'Marina Souza', owner_user_id: MARINA.id }
const NORTE = { id: 'ws-norte', kind: 'empresa', name: 'Norte' }

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
  sessionStorage.clear()
})

const SALVAS = [
  {
    id: 'c-slack',
    kind: 'agente',
    agent_id: 'agente-scopus',
    title: null,
    first_request: 'Quem são as Contas Quentes?',
    updated_at: '2026-10-15T12:00:00Z',
    open_run_id: null,
    origin: 'slack',
  },
  {
    id: 'c-althius',
    kind: 'coordenada',
    agent_id: null,
    title: 'ICP da Norte',
    first_request: 'Montem o ICP',
    updated_at: '2026-10-14T12:00:00Z',
    open_run_id: null,
    origin: 'althius',
  },
]

const CONVERSAS: Record<string, unknown> = {
  'c-slack': {
    id: 'c-slack',
    kind: 'agente',
    agent_id: 'agente-scopus',
    origin: 'slack',
    runs: [{
      id: 'run-0',
      request_text: 'Quem são as Contas Quentes?',
      status: 'succeeded',
      events: [{ seq: 1, kind: 'texto', agent_id: 'agente-scopus', payload: { texto: 'São três: Norte, Sul e Leste.' } }],
    }],
  },
}

/** A Marina abre o Norte, onde já mencionou o Scopus num thread do Slack. */
function abrir(rota: string) {
  localStorage.setItem('althius:modo_demo', 'false')
  sessionStorage.setItem('althius:workspace', NORTE.id)
  window.history.replaceState(null, '', rota)
  const enviados: Record<string, unknown>[] = []
  const supabase = criarSupabaseFalso({
    sessao: sessaoDe(MARINA),
    tabelas: {
      workspaces: [PESSOAL, NORTE],
      workspace_memberships: [
        { workspace_id: PESSOAL.id, role: 'admin', user_id: MARINA.id, active: true },
        { workspace_id: NORTE.id, role: 'admin', user_id: MARINA.id, active: true },
      ],
    },
    rpcs: {
      bootstrap_personal_workspace: () => PESSOAL,
      list_owned_sender_accounts: () => [],
      ...rpcsDeAgentes(criarBancoDeAgentes()),
      list_agent_conversations: () => SALVAS.map(({ id, kind, agent_id, origin }) => ({ id, kind, agent_id, origin })),
      list_named_agent_conversations: () => SALVAS,
      get_agent_conversation: (parametros) => CONVERSAS[String(parametros.p_conversation_id)] ?? { runs: [] },
      get_agent_run_events: () => ({ status: 'succeeded', error_code: null, events: [] }),
    },
    funcoes: {
      'agent-conversation': (corpo) => {
        if (corpo.action === 'capability') return { status: 200, corpo: { available: true } }
        enviados.push(corpo)
        return { status: 202, corpo: { conversationId: corpo.conversationId ?? 'nova', runId: 'run-1', status: 'queued' } }
      },
    },
  })
  const servicos = criarServicosDoNavegadorFalsos()
  const usuario = userEvent.setup()
  render(<RaizDoAplicativo cliente={supabase.cliente} servicos={servicos.servicos} />)
  return { usuario, enviados }
}

describe('A Conversa do Slack na Althius', () => {
  it('aparece nas Conversas anteriores com a marca do Slack; a da Althius fica sem marca', async () => {
    abrir('/')

    const lista = within(await screen.findByRole('region', { name: 'Conversas anteriores' }))
    const [doSlack, daAlthius] = lista.getAllByRole('listitem')
    expect(within(doSlack).getByText('Quem são as Contas Quentes?')).toBeInTheDocument()
    expect(within(doSlack).getByText('Slack')).toBeInTheDocument()
    expect(within(daAlthius).getByText('ICP da Norte')).toBeInTheDocument()
    expect(within(daAlthius).queryByText('Slack')).not.toBeInTheDocument()
  })

  it('abrir mostra os passos na Conversa do Agente, com o composer desabilitado', async () => {
    const { usuario, enviados } = abrir('/')

    await usuario.click(await screen.findByRole('button', { name: 'Abrir a Conversa Quem são as Contas Quentes?' }))

    expect(await screen.findByText('São três: Norte, Sul e Leste.')).toBeInTheDocument()
    expect(screen.getByText('Quem são as Contas Quentes?')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Scopus' })).toBeInTheDocument()
    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.getByText('Esta Conversa continua no Slack')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Mensagem para Scopus' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    expect(enviados).toEqual([])
  })

  it('voltar leva à Conversa da Althius com o Agente, que continua respondendo pela Althius', async () => {
    const { usuario } = abrir('/agentes/agente-scopus/conversa?slack=c-slack')

    await screen.findByText('São três: Norte, Sul e Leste.')
    await usuario.click(screen.getByRole('link', { name: 'Voltar à Conversa na Althius' }))

    expect(screen.queryByText('São três: Norte, Sul e Leste.')).not.toBeInTheDocument()
    expect(screen.queryByText('Esta Conversa continua no Slack')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Mensagem para Scopus' })).toBeEnabled()
  })

  it('uma Conversa que não é deste Agente não abre aqui', async () => {
    abrir('/agentes/agente-ethos/conversa?slack=c-slack')

    expect(await screen.findByText('Esta Conversa do Slack é de outro Agente.')).toBeInTheDocument()
    expect(screen.queryByText('São três: Norte, Sul e Leste.')).not.toBeInTheDocument()
  })
})
