---
tags: [jscar, erros, debug, historico]
---

# Erros e Soluções

> Registro de problemas encontrados e como foram resolvidos.

Ver também: [[banco-de-dados]] · [[configuracoes]]

---

## ERR-001 — `vehicle_categories` não encontrada no Supabase

### Sintoma
```
Could not find the table 'public.vehicle_categories' in the schema cache
```

Ocorria em qualquer requisição para `/api/categories`.

### Causa Raiz

Os arquivos SQL (`supabase-schema.sql`, `supabase-categories.sql`, `supabase-security.sql`) existiam apenas **localmente** na pasta `backend/`. Nunca foram executados no Supabase. A tabela simplesmente não existia no banco de dados.

### Solução Aplicada

1. Criado o arquivo `supabase_migration.sql` na raiz do projeto — consolida todos os SQL anteriores em um único script com:
   - Criação de todas as tabelas na ordem correta
   - Funções e triggers
   - RLS + policies
   - GRANTs para todas as roles
   - Seed das 7 categorias padrão

2. Script executado no **SQL Editor do Supabase** (Dashboard → SQL Editor → New query → colar o conteúdo → Run).

### Como Verificar se Está Resolvido

```sql
-- Deve retornar as 5 tabelas
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Deve retornar 7 categorias
SELECT name, slug FROM public.vehicle_categories ORDER BY sort_order;
```

---

## ERR-002 — Backend usando `anon key` em vez de `service_role key`

### Sintoma

Operações de escrita (INSERT/UPDATE/DELETE) falhavam silenciosamente ou retornavam erro 403 do Supabase, mesmo com RLS configurado.

### Causa Raiz

Uso inadvertido da chave pública (`anon key`) em vez da chave de serviço.

### Solução Aplicada

O `config/supabase.js` foi verificado e confirmado que usa `SUPABASE_SERVICE_ROLE_KEY`:

```js
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
```

A `service_role` tem `bypassrls = true`, portanto não é bloqueada pelo RLS.

**Regra:** nunca use a `anon key` no backend. A `anon key` é para clientes que respeitam o RLS (ex: apps mobile, frontend direto).

---

## ERR-003 — Número de WhatsApp fictício em produção

### Sintoma

Botões de WhatsApp abriam conversa para o número `(86) 9 9999-9999` (placeholder de desenvolvimento).

### Solução Aplicada

Substituição em massa do número `5586999999999` pelo número real `5586994133034` em todos os arquivos do projeto:

| Arquivo | Ocorrências |
|---------|-------------|
| `frontend/index.html` | 7 links + 2 textos |
| `frontend/script.js` | constante `WA` |
| `frontend/estoque/estoque.html` | 3 links |
| `frontend/estoque/estoque.js` | constante `WA` |
| `frontend/veiculo/veiculo.html` | 3 links |
| `frontend/veiculo/veiculo.js` | constante `WA` |
| `frontend/admin/admin.html` | 2 placeholders |

**Total:** 8 arquivos, 22 ocorrências.

---

## Problemas Conhecidos / A Observar

### Imagens de categorias muito escuras

**Status:** Resolvido em 2026-05-18.

O overlay inicial cobria a imagem com `opacity: 0.35` e `grayscale(30%)`. Corrigido para `opacity: 0.80` e overlay gradiente leve (`rgba(0,0,0,0.75) 0% → transparent 55%`).

### Cards de categoria em formato retrato

**Status:** Resolvido em 2026-05-18.

Cards estavam em 260×340px (retrato). Ajustado para 320×200px (paisagem), mais adequado para fotos de veículos.

---

## Checklist de Debug

Antes de investigar qualquer erro de API, verificar:

- [ ] O servidor backend está rodando em `localhost:5000`?
- [ ] O arquivo `.env` está preenchido corretamente?
- [ ] A `supabase_migration.sql` foi executada no Supabase?
- [ ] A `SUPABASE_SERVICE_ROLE_KEY` é a chave de **service role** (começa com `sb_secret_...`)?
- [ ] O bucket `vehicles` existe e está público no Supabase Storage?
