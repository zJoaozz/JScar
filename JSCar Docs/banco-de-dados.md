---
tags: [jscar, database, supabase]
---

# Banco de Dados — Supabase

> PostgreSQL gerenciado pelo Supabase. Migration completa disponível em `supabase_migration.sql` na raiz do projeto.

Ver também: [[configuracoes]] · [[rotas-api]]

---

## Tabelas

### `app_users`

Usuários administradores do sistema. Aceita **apenas um registro** (unique index garante isso).

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | uuid | PK, gerado automaticamente |
| `email` | text | único, obrigatório |
| `password_hash` | text | hash bcrypt |
| `nome` | text | nome de exibição |
| `role` | text | padrão: `'admin'` |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto via trigger |

**Rotas que acessam:** `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/setup`, `PUT /api/auth/change-password`

---

### `settings`

Configurações públicas da loja (nome, contato, endereço).

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | uuid | PK |
| `nome` | text | nome da loja |
| `whatsapp` | text | número no formato `5586994133034` |
| `instagram` | text | handle ou URL |
| `endereco` | text | endereço completo |
| `cidade` | text | cidade |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto via trigger |

**Rotas que acessam:** `GET /api/settings`, `PUT /api/settings`

---

### `vehicle_categories`

Categorias de veículos exibidas no carrossel da página inicial.

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | uuid | PK |
| `name` | text | ex: `'SUV'` |
| `slug` | text | único, ex: `'suv'` |
| `description` | text | subtítulo do card |
| `image_url` | text | URL pública no Supabase Storage |
| `icon` | text | classe Bootstrap Icon, ex: `'bi-truck-front-fill'` |
| `sort_order` | integer | ordem de exibição |
| `active` | boolean | padrão `true` |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto via trigger |

**Categorias padrão inseridas pela migration:**

| name | slug | sort_order |
|------|------|-----------|
| Hatch | hatch | 1 |
| Sedan | sedan | 2 |
| SUV | suv | 3 |
| Picape | picape | 4 |
| Elétrico | eletrico | 5 |
| Premium | premium | 6 |
| Moto | moto | 7 |

**Rotas que acessam:** `GET /api/categories`, `GET /api/categories/:slug`, `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id`, `PATCH /api/categories/:id/status`, `PUT /api/categories/reorder`

---

### `vehicles`

Catálogo principal de veículos.

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | uuid | PK |
| `titulo` | text | obrigatório |
| `marca` | text | obrigatório |
| `modelo` | text | obrigatório |
| `ano` | text | obrigatório |
| `combustivel` | text | ex: `'Flex'`, `'Elétrico'` |
| `cambio` | text | ex: `'Automático'` |
| `km` | text | quilometragem |
| `preco` | text | ex: `'85000'` |
| `cidade` | text | |
| `cor` | text | |
| `opcionais` | text[] | array de strings |
| `descricao` | text | texto longo |
| `destaque` | boolean | aparece na seção Destaques |
| `hero` | boolean | aparece no slider principal (só 1 por vez, via trigger) |
| `categoria` | text | slug da categoria |
| `whatsapp` | text | número específico do veículo |
| `visualizacoes` | integer | contador, padrão 0 |
| `status` | text | `'disponivel'` \| `'reservado'` \| `'vendido'` |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto via trigger |

**Rotas que acessam:** todas as rotas de `/api/vehicles`

---

### `vehicle_images`

Fotos de cada veículo. Deletar o veículo remove as imagens em cascata.

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | uuid | PK |
| `vehicle_id` | uuid | FK → `vehicles.id` ON DELETE CASCADE |
| `url` | text | URL pública no Supabase Storage |
| `filename` | text | nome do arquivo |
| `position` | integer | ordem das fotos, padrão 0 |
| `created_at` | timestamptz | auto |

**Rotas que acessam:** criadas/deletadas junto com veículos via `POST /api/vehicles`, `DELETE /api/vehicles/:id`

---

## Funções e Triggers

| Nome | Tipo | Descrição |
|------|------|-----------|
| `set_updated_at()` | trigger function | atualiza `updated_at` em qualquer UPDATE |
| `ensure_single_hero()` | trigger function | garante que só 1 veículo tenha `hero = true` |
| `increment_vehicle_views(uuid)` | function | incrementa `visualizacoes` de um veículo |

---

## Row Level Security (RLS)

| Tabela | RLS | Policy pública |
|--------|-----|----------------|
| `app_users` | ✅ ativado | ❌ nenhuma (só service_role acessa) |
| `settings` | ✅ ativado | ✅ SELECT para todos |
| `vehicle_categories` | ✅ ativado | ✅ SELECT onde `active = true` |
| `vehicles` | ✅ ativado | ✅ SELECT para todos |
| `vehicle_images` | ✅ ativado | ✅ SELECT para todos |

> O backend usa `SUPABASE_SERVICE_ROLE_KEY` que tem `bypassrls = true` — acessa tudo independente das policies.

---

## Storage

- **Bucket:** `vehicles` (público)
- Imagens de veículos: `vehicles/<filename>.webp`
- Imagens de categorias: `categories/<slug>-<timestamp>.webp`

---

## Variáveis de Ambiente Necessárias

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=vehicles
```

Ver detalhes completos em [[configuracoes]].
