---
tags: [jscar, backend, api, express]
---

# Rotas da API — Backend Express

> Base URL: `http://localhost:5000/api`
> Autenticação: `Authorization: Bearer <token>` nas rotas protegidas.

Ver também: [[banco-de-dados]] · [[configuracoes]]

---

## Autenticação — `/api/auth`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/api/auth/login` | ❌ | Login com email + senha, retorna JWT |
| `GET` | `/api/auth/me` | ✅ | Retorna dados do usuário logado |
| `GET` | `/api/auth/setup` | ❌ | Verifica se o admin já foi criado |
| `POST` | `/api/auth/setup` | ❌ | Cria o primeiro (e único) admin |
| `PUT` | `/api/auth/change-password` | ✅ | Altera a senha do admin |

### POST /api/auth/login
```json
// Body
{ "email": "admin@exemplo.com", "password": "senha123" }

// Resposta
{ "success": true, "token": "eyJ...", "user": { "id": "...", "email": "...", "nome": "..." } }
```

### POST /api/auth/setup
```json
// Body
{ "email": "admin@exemplo.com", "password": "senha123", "nome": "Admin" }
// Só funciona se não houver nenhum usuário cadastrado
```

---

## Categorias — `/api/categories`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/categories` | ❌ | Lista categorias ativas; `?includeInactive=true` requer auth |
| `GET` | `/api/categories/:slug` | ❌ | Busca categoria por slug |
| `POST` | `/api/categories` | ✅ | Cria nova categoria (aceita `multipart/form-data` com imagem) |
| `PUT` | `/api/categories/:id` | ✅ | Atualiza categoria |
| `DELETE` | `/api/categories/:id` | ✅ | Remove categoria (falha se estiver em uso por veículos) |
| `PATCH` | `/api/categories/:id/status` | ✅ | Ativa/desativa categoria |
| `PUT` | `/api/categories/reorder` | ✅ | Reordena categorias |

### GET /api/categories — Resposta
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "SUV",
      "slug": "suv",
      "description": "Espaço e presença",
      "image_url": "https://...",
      "icon": "bi-truck-front-fill",
      "sort_order": 3,
      "active": true
    }
  ]
}
```

### POST /api/categories — Body (multipart/form-data)
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `name` | string | ✅ |
| `slug` | string | opcional (gerado do name) |
| `description` | string | opcional |
| `icon` | string | opcional |
| `sort_order` | number | opcional |
| `active` | boolean | opcional |
| `image` | file | opcional |

---

## Veículos — `/api/vehicles`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/vehicles` | ❌ | Lista veículos com filtros e paginação |
| `GET` | `/api/vehicles/:id` | ❌ | Detalhes de um veículo |
| `POST` | `/api/vehicles` | ✅ | Cria veículo (aceita até 15 imagens) |
| `PUT` | `/api/vehicles/:id` | ✅ | Atualiza veículo |
| `DELETE` | `/api/vehicles/:id` | ✅ | Remove veículo e suas imagens |
| `PATCH` | `/api/vehicles/:id/destaque` | ✅ | Alterna flag `destaque` |
| `PATCH` | `/api/vehicles/:id/hero` | ✅ | Define como hero (desativa o anterior) |
| `PATCH` | `/api/vehicles/:id/status` | ✅ | Altera status (`disponivel`/`reservado`/`vendido`) |
| `POST` | `/api/vehicles/:id/views` | ❌ | Incrementa contador de visualizações |
| `GET` | `/api/vehicles/stats` | ✅ | Estatísticas do estoque |

### GET /api/vehicles — Query Params

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `busca` | string | busca por título, marca ou modelo |
| `marca` | string | filtra por marca |
| `categoria` | string | filtra por slug de categoria |
| `combustivel` | string | filtra por combustível |
| `status` | string | `disponivel` / `reservado` / `vendido` |
| `destaque` | boolean | `true` para só destaques |
| `hero` | boolean | `true` para o veículo hero |
| `preco_min` | number | preço mínimo |
| `preco_max` | number | preço máximo |
| `ordenacao` | string | `recente` / `preco_asc` / `preco_desc` / `km_asc` |
| `page` | number | página (padrão: 1) |
| `limit` | number | itens por página (padrão: 12) |

### POST /api/vehicles — Body (multipart/form-data)

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `titulo` | string | ✅ |
| `marca` | string | ✅ |
| `modelo` | string | ✅ |
| `ano` | string | ✅ |
| `combustivel` | string | opcional |
| `cambio` | string | opcional |
| `km` | string | opcional |
| `preco` | string | opcional |
| `cidade` | string | opcional |
| `cor` | string | opcional |
| `opcionais` | string (JSON array) | opcional |
| `descricao` | string | opcional |
| `destaque` | boolean | opcional |
| `hero` | boolean | opcional |
| `categoria` | string | slug da categoria |
| `whatsapp` | string | opcional |
| `status` | string | opcional |
| `images` | files (até 15) | opcional |

---

## Configurações — `/api/settings`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/settings` | ❌ | Retorna configurações da loja |
| `PUT` | `/api/settings` | ✅ | Atualiza configurações |

### PUT /api/settings — Body
```json
{
  "nome": "JSCar Veículos",
  "whatsapp": "5586994133034",
  "instagram": "https://www.instagram.com/js_carpi/",
  "endereco": "Av. Frei Serafim, 2300",
  "cidade": "Teresina–PI"
}
```

---

## Health Check

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Verifica se o servidor está no ar |

---

## Formato de Erro Padrão

```json
{
  "success": false,
  "message": "Descrição do erro"
}
```

---

## Processamento de Imagens

As imagens enviadas passam pelo middleware `compressImages.js` antes de serem salvas:
- Convertidas para **WebP**
- Redimensionadas para no máximo **1200×800px**
- Qualidade **82%**
- Armazenadas no Supabase Storage (bucket `vehicles`)
