# Codex Agent Guide – ERP Genesis (BPO Financeiro)

Bem-vindo(a), agente 👋  
Este repositório contém o **ERP Genesis**, um sistema de BPO financeiro multi-empresa focado em:

- Contas a pagar / receber
- Conciliação bancária
- Importações (proformas/invoices, custos de importação)
- Fiscal (notas, tributos, obrigações)
- Dashboards financeiros (fluxo de caixa, DRE, indicadores)

O objetivo é ter um sistema **altamente automático, inteligente e integrado via APIs** (bancos, adquirentes, sistemas fiscais etc.), respeitando sempre o contexto multi-empresa.

---

## 1. Stack e ferramentas principais

- **Framework:** Next.js 16 (App Router) + React 19
- **Linguagem:** TypeScript
- **UI/UX:**
  - Tailwind CSS v4
  - Radix UI (@radix-ui/react-…)
  - shadcn-ui (cards, tabelas, inputs, etc. – seguir padrões existentes)
  - lucide-react para ícones
  - framer-motion para animações
- **Formulários e validação:**
  - react-hook-form
  - zod (validação de schema)
- **Dados e autenticação:**
  - Supabase (PostgreSQL com RLS)
  - @supabase/supabase-js
  - @supabase/auth-helpers-nextjs / @supabase/ssr

**Padrão de idioma:**

- Código (nomes de variáveis, funções, tipos): preferencialmente **em inglês**.
- Textos de interface (labels, placeholders, toasts, mensagens de erro): **pt-BR**.

---

## 2. Scripts importantes (sempre use para validar mudanças)

Ao propor ou aplicar mudanças, priorize rodar:

- `npm run dev` – ambiente de desenvolvimento.
- `npm run build` – garante que o build de produção passa.
- `npm run lint` – checagem de estilo/ESLint.
- `npm run typecheck` – checagem de tipos TS.
- `npm run check` – **principal comando de qualidade** (lint + typecheck).
- `npm run format` – checa se a formatação (Prettier + Tailwind plugin) está ok.
- `npm run format:fix` – **formata automaticamente todo o projeto**.
- `npm run test` – ainda não há testes reais; hoje é apenas um placeholder.
- `npm run clean` – limpa `.next` e `node_modules` (usar com cuidado).

### Recomendações para agentes (muito importante)

- Para **qualquer refactor grande** ou mudança que altere vários arquivos:
  - Sempre rodar **`npm run format:fix && npm run check`** depois das alterações.
- Para mudanças menores:
  - Pelo menos rodar **`npm run check`** e, se necessário, `npm run format:fix` nos arquivos tocados.

---

## 3. Organização do código (visão geral)

> Nem todos os caminhos abaixo podem existir ainda; ao criar novos arquivos, siga os padrões existentes.

- `app/`
  - Rotas da App Router do Next.js.
  - Exemplos:
    - `app/cadastro/clientes-bpo/[codigo_erp]/page.tsx` – edição de empresas BPO.
    - `app/(dashboard)/...` – páginas de dashboards e visão operacional.
    - `app/(auth)/login/page.tsx` – autenticação.
- `components/`
  - Componentes reutilizáveis de UI (botões, tabelas, cards, etc.).
  - Exemplos conhecidos:
    - `SidebarRailPro`
    - `TopbarPro`
    - `PeriodContext` / `PeriodProvider`
- `lib/`
  - Código de infraestrutura e utilitários:
    - `lib/supabase/` – criação de clientes Supabase (server/client).
    - `lib/routes.ts` – helpers tipadas de rotas.
    - `lib/utils.ts` – funções genéricas (ex.: `cn`, helpers de datas, etc.).
    - `lib/api/` – clients HTTP genéricos (quando necessário).
- `types/`
  - Definições de tipos de domínio (Ex.: `ContaPagar`, `Fornecedor`, etc.) se existirem.
- `styles/` ou equivalente
  - Configurações globais de Tailwind (quando aplicável).

**Regras para novos arquivos:**

- Mantenha páginas da App Router em `app/`.
- Prefira extrair “lógicas pesadas” para hooks (`hooks/`) ou serviços (`lib/`, `lib/services/`).
- Componentes de UI devem ser puros sempre que possível. Use `use client` só quando realmente necessário (estado, eventos, browser APIs).

---

## 4. Domínio de negócio e multi-tenancy

O sistema é **multi-empresa (multi-tenant)**. Conceitos chave:

- **empresas_bpo**
  - Tabela principal das empresas.
  - Chave importante: `codigo_erp` (representa cada empresa/cliente).
  - Existe tabela de auditoria associada (ex.: `empresas_bpo_audit`).
- Outros domínios (nem todos implementados ainda, mas relevantes):
  - Contas a pagar (fornecedores, documentos, vencimentos, centros de custo).
  - Contas a receber (clientes, títulos, baixas).
  - Conciliação bancária e de cartões.
  - Importações (ID único de importação, custos relacionados).
  - Fiscal (notas, tributos, integrações futuras com APIs fiscais).

**Regra de ouro para qualquer agente:**

> **Nunca misturar dados de empresas diferentes.**  
> Sempre que trabalhar com queries, mutations ou APIs, garantir que:
>
> - existe filtro por `empresa_codigo_erp` / `codigo_erp`, ou
> - o contexto da empresa está sendo respeitado (por exemplo, via sessão do usuário).

---

## 5. Supabase: regras de uso

- Use os clients centralizados em `lib/supabase` (ou equivalente). Não crie novos `createClient` soltos.
- Em **Componentes Server**:
  - Prefira usar `@supabase/ssr` / helpers oficiais.
- Em **Componentes Client**:
  - Nunca use a **service key**.
  - Respeite RLS; não contorne com queries administrativas.
- Ao criar ou alterar tabelas:
  - Preserve colunas de auditoria (`created_at`, `updated_at`, etc.) e triggers de atualização automática.
  - Quando existir tabela `_audit`, mantenha consistência (ex.: ao adicionar campos importantes em `empresas_bpo`, considere refletir na `_audit`).

Quando mudanças de banco forem necessárias, agente deve:

1. Descrever a alteração (ex.: “adicionar coluna `meio_pagamento` em `contas_pagar`”).
2. Atualizar:
   - SQL de migração (quando o projeto tiver pasta de migrations).
   - Tipos TypeScript relacionados.
   - Páginas/formulários que usam esse dado.
3. Sugerir testes manuais mínimos (ex.: “criar título, salvar, ver se aparece no dashboard”).

---

## 6. Integrações com APIs externas

O objetivo do projeto é ser **altamente integrável com APIs** (bancos, adquirentes, fiscos etc.).  
Boas práticas ao criar ou editar integrações:

1. **Localização do código**
   - Criar clients em `lib/integrations/<nome-servico>.ts` ou estrutura semelhante.
   - Não misturar chamada HTTP direta dentro de componentes React.

2. **Validação e tipos**
   - Definir tipos TS para requests/responses.
   - Usar **zod** para validar respostas de APIs externas antes de salvar no banco.
   - Mapear dados crus → modelos de domínio (ex.: resposta da API Rede → `PagamentoCartao` interno).

3. **Multi-empresa**
   - Sempre associar registros ao `empresa_codigo_erp` correto.
   - Evitar hard-codes de empresa, exceto quando explicitamente faz parte da regra (e documentar isso claramente em comentários).

4. **Resiliência**
   - Tratar erros de rede (timeouts, status 4xx/5xx).
   - Nunca expor segredos (keys de API) em código cliente.

---

## 7. UI/UX – padrões visuais

- Respeitar layout base:
  - `TopbarPro` no topo.
  - `SidebarRailPro` na lateral (quando aplicável).
  - Uso de `PeriodProvider` / `PeriodContext` para filtros de data globais onde já estiver implementado.
- Componentes:
  - Priorizar componentes shadcn já existentes (Card, Button, Table, Dialog, etc.).
  - Seguir classes utilitárias de Tailwind semelhantes às usadas nas páginas atuais (padding, grid, spacing).
- Idioma:
  - Labels, tooltips, placeholders e mensagens para o usuário em **pt-BR**.
  - Manter terminologia consistente: “Contas a pagar”, “Contas a receber”, “Conciliação”, “Importações”, etc.

---

## 8. Qualidade, refactors e novas features

Ao implementar qualquer mudança:

1. **Garanta que o código compila e está tipado**
   - Rodar `npm run check`.

2. **Formatação de código**
   - Antes de commitar ou abrir PR, preferencialmente rodar:
     - `npm run format:fix`
     - `npm run check`

3. **Para refactors grandes ou mudanças multi-arquivo (regra obrigatória para agentes):**
   - Sempre rodar **`npm run format:fix && npm run check`** ao final da alteração.
   - Se algum comando falhar, corrigir até que ambos passem.

4. **Mantenha coesão de domínio**
   - Se alterar algo em `cadastro` (ex.: empresas BPO, clientes/fornecedores), verificar se:
     - há impacto em páginas de lançamento (contas a pagar/receber),
     - há impacto em integrações que usam esses cadastros.

5. **Refactors**
   - Prefira refactors incrementais:
     - extrair componentes reutilizáveis,
     - extrair hooks para lógica repetida,
     - reduzir duplicação de chamadas Supabase.
   - Sempre que mexer em vários arquivos, explique claramente no diff/descrição o objetivo.

---

## 9. Como escrever respostas/mudanças como agente

Ao propor mudanças:

- Seja explícito:
  - “Atualizei `app/cadastro/clientes-bpo/[codigo_erp]/page.tsx` para…”
  - “Criei `lib/integrations/rede.ts` para lidar com…”
- Sempre que possível, liste:
  - arquivos tocados,
  - novos tipos adicionados,
  - endpoints ou tabelas Supabase usados/alterados,
  - scripts executados **(por exemplo: `npm run format:fix && npm run check`)**,
  - passos manuais mínimos para testar a feature.

---

## 10. Limitações atuais

- Não há suíte de testes automatizados robusta (ainda).
  - Quando possível, sugira e/ou crie testes unitários/comportamentais, mas mantenha-os simples e alinhados ao stack escolhido pelo mantenedor.
- O foco inicial é:
  - ter o **fluxo de trabalho completo** rodando (cadastros → lançamentos → conciliação → relatórios),
  - com **boa UX** e **dados consistentes entre empresas**.

---

_Fim do guia. Se tiver dúvida sobre a intenção de negócio (não apenas técnica), pergunte em linguagem natural para o usuário antes de fazer mudanças grandes._
