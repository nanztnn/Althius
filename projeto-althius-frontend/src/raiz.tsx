import { useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { App } from '@/App'
import { AplicativoAutenticado } from '@/auth/aplicativo'
import { ehCaminhoDeAcesso } from '@/auth/destino'
import { PaginaDoDocumentoPublico, documentoPublicoDoCaminho } from '@/auth/documento-publico'
import type { ServicosDoNavegador } from '@/auth/servicos-do-navegador'
import type { ModoDoAmbiente } from '@/fonte/ambiente'
import { criarAmbienteDeDemonstracao } from '@/fonte/composicao'

/**
 * Chave atual da escolha de ambiente neste navegador. Valores: `demonstracao` | `real`.
 * Substitui `althius:modo_demo` (boolean) para o `true` antigo do protótipo não prender o Cliente em produção.
 */
export const CHAVE_DO_AMBIENTE = 'althius:ambiente'
/** Nome antigo: `true` = Demonstração, `false` = operacional. Só lido em desenvolvimento; em produção é apagado. */
const CHAVE_ANTIGA_DO_AMBIENTE = 'althius:modo_demo'

export function lembrarAmbiente(ambiente: ModoDoAmbiente, armazenamento: Storage = localStorage) {
  armazenamento.setItem(CHAVE_DO_AMBIENTE, ambiente)
  armazenamento.removeItem(CHAVE_ANTIGA_DO_AMBIENTE)
}

/**
 * A escolha do ambiente na abertura da página.
 * Em produção, sem escolha salva na chave nova, o padrão é o Workspace operacional (tela de entrada).
 * Em desenvolvimento, o padrão continua a Demonstração (protótipo).
 */
export function ambienteNaAbertura({
  busca,
  caminho,
  armazenamento = localStorage,
  producao = import.meta.env.PROD,
}: {
  busca: string
  caminho: string
  armazenamento?: Storage
  /** Build de produção (`import.meta.env.PROD`). Nos testes, passar explicitamente. */
  producao?: boolean
}): ModoDoAmbiente {
  const params = new URLSearchParams(busca.startsWith('?') ? busca.slice(1) : busca)
  if (params.get('auth') === 'true' || params.get('demo') === 'false') return 'real'
  if (params.get('demo') === 'true') return 'demonstracao'
  if (ehCaminhoDeAcesso(caminho)) return 'real'

  const salvo = armazenamento.getItem(CHAVE_DO_AMBIENTE)
  if (salvo === 'demonstracao' || salvo === 'real') return salvo

  // Chave antiga: em produção some e não vale; em desenvolvimento migra uma vez para a chave nova.
  const antigo = armazenamento.getItem(CHAVE_ANTIGA_DO_AMBIENTE)
  if (antigo !== null) {
    armazenamento.removeItem(CHAVE_ANTIGA_DO_AMBIENTE)
    if (!producao) {
      const migrado: ModoDoAmbiente = antigo === 'true' ? 'demonstracao' : 'real'
      armazenamento.setItem(CHAVE_DO_AMBIENTE, migrado)
      return migrado
    }
  }

  return producao ? 'real' : 'demonstracao'
}

/**
 * A escolha do ambiente: a Demonstração ou o acesso ao Workspace operacional. Sem Supabase configurado, só existe a
 * Demonstração. Cada ambiente monta as próprias fontes; trocar de um para outro desmonta o anterior inteiro.
 */
export function RaizDoAplicativo({ cliente, servicos }: { cliente: SupabaseClient | null; servicos: ServicosDoNavegador }) {
  // As telas de acesso, inclusive o link de redefinição de senha, e o link de um convite são sempre do Workspace
  // operacional, mesmo num navegador que nunca o escolheu.
  const [abriuPeloAcesso] = useState(() => ehCaminhoDeAcesso(window.location.pathname))
  const [documentoPublico] = useState(() => documentoPublicoDoCaminho(window.location.pathname))
  const [ambiente, setAmbiente] = useState<ModoDoAmbiente>(() =>
    ambienteNaAbertura({
      busca: window.location.search,
      caminho: window.location.pathname,
    }),
  )

  // E fica lembrado neste navegador: os links de confirmação do cadastro e de entrada por código voltam ao destino, fora
  // das telas de acesso, e também precisam abrir o Workspace operacional.
  useEffect(() => {
    if (abriuPeloAcesso && cliente) lembrarAmbiente('real')
  }, [abriuPeloAcesso, cliente])

  const escolherAmbiente = (escolhido: ModoDoAmbiente) => {
    lembrarAmbiente(escolhido)
    setAmbiente(escolhido)
  }

  // Os Termos e a Política de Privacidade são públicos: não pedem login, não abrem a Demonstração nem escolhem ambiente.
  if (documentoPublico) return <PaginaDoDocumentoPublico documento={documentoPublico} />

  if (ambiente === 'demonstracao' || !cliente) {
    return <AplicativoDeDemonstracao aoAlternarParaAutenticado={cliente ? () => escolherAmbiente('real') : undefined} />
  }

  return <AplicativoAutenticado cliente={cliente} servicos={servicos} aoAcessarDemonstracao={() => escolherAmbiente('demonstracao')} />
}

function AplicativoDeDemonstracao({ aoAlternarParaAutenticado }: { aoAlternarParaAutenticado?: () => void }) {
  const ambiente = useMemo(() => criarAmbienteDeDemonstracao({ armazenamento: window.localStorage }), [])
  // O banner "Modo Protótipo" é só do build de desenvolvimento. Em produção a Demonstração não se apresenta como protótipo.
  const bannerDoPrototipo = import.meta.env.DEV && aoAlternarParaAutenticado

  return (
    <>
      {bannerDoPrototipo && (
        <div className="flex items-center justify-between border-b border-al-line bg-al-surface/40 px-4 py-1.5 text-xs text-al-muted">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-al-sucesso" />
            <span className="font-medium text-al-ink">Modo Protótipo (Completo)</span>
            <span>· Navegação sem necessidade de e-mail</span>
          </div>
          <button
            type="button"
            onClick={aoAlternarParaAutenticado}
            className="cursor-pointer text-al-accent hover:underline"
          >
            Acessar tela de login Supabase
          </button>
        </div>
      )}
      <App ambiente={ambiente} />
    </>
  )
}
