---
tags: [jscar, configuracao, env, deploy]
---

# Configurações e Setup

> Tudo o que é necessário para rodar e fazer deploy da JSCar.

Ver também: [[index]] · [[banco-de-dados]]

---

## Variáveis de Ambiente (`.env`)

O arquivo `.env` fica em `backend/.env` e **não deve ser versionado**. Use `.env.example` como referência.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `PORT` | ❌ | Porta do servidor (padrão: `5000`) |
| `JWT_SECRET` | ✅ | Chave secreta para assinar tokens JWT |
| `SUPABASE_URL` | ✅ | URL do projeto Supabase — formato: `https://SEU_ID.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chave de serviço do Supabase (bypass RLS) |
| `SUPABASE_BUCKET` | ❌ | Nome do bucket de storage (padrão: `vehicles`) |
| `FRONTEND_URL` | ❌ | URL do frontend para CORS (padrão: `http://localhost:5500`) |

### Onde encontrar as credenciais do Supabase

1. Acesse [supabase.com](https://supabase.com) → seu projeto
2. **Project URL:** Settings → API → Project URL
3. **Service Role Key:** Settings → API → `service_role` (secret)

> ⚠️ **Nunca exponha a `service_role` key no frontend.**

### Exemplo de `.env`

```env
PORT=5000
JWT_SECRET=uma_string_longa_e_aleatoria_aqui
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_BUCKET=vehicles
FRONTEND_URL=http://localhost:5500
```

---

## Dependências do Backend (`package.json`)

| Pacote | Versão | Uso |
|--------|--------|-----|
| `express` | 4.18.2 | Framework HTTP |
| `@supabase/supabase-js` | 2.105.4 | Cliente do Supabase |
| `bcryptjs` | — | Hash de senhas |
| `jsonwebtoken` | — | Geração e verificação de JWT |
| `multer` | — | Upload de arquivos (multipart/form-data) |
| `sharp` | — | Compressão e conversão de imagens para WebP |
| `cors` | — | Habilitar CORS para o frontend |
| `dotenv` | — | Carregamento do `.env` |
| `nodemon` | — | Reinício automático em desenvolvimento |

### Instalar

```bash
cd backend
npm install
```

---

## Configuração do Banco de Dados

### Primeira vez (setup do zero)

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie a `Project URL` e a `service_role key` para o `.env`
3. Acesse **SQL Editor** no dashboard do Supabase
4. Cole o conteúdo de `supabase_migration.sql` (raiz do projeto)
5. Clique em **Run**

### Verificar se funcionou

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- Deve retornar: app_users, settings, vehicle_categories, vehicle_images, vehicles
```

### Criar o primeiro admin

Após subir o servidor, acesse:
```
GET http://localhost:5000/api/auth/setup
```
Se retornar `{ "exists": false }`, faça:
```
POST http://localhost:5000/api/auth/setup
Body: { "email": "seu@email.com", "password": "sua_senha", "nome": "Admin" }
```

---

## CORS

O backend permite requisições das seguintes origens:

```js
// server.js
origins: [
  'http://localhost:5500',
  'http://localhost:5501',
  'http://localhost:3000',
  process.env.FRONTEND_URL
]
```

Para produção, defina `FRONTEND_URL` com o domínio real do frontend.

---

## Upload e Armazenamento de Imagens

| Parâmetro | Valor |
|-----------|-------|
| Máximo de imagens por veículo | 15 |
| Tamanho máximo por imagem | 15 MB |
| Formatos aceitos | JPG, PNG, WebP |
| Formato de saída | WebP |
| Dimensão máxima | 1200 × 800 px |
| Qualidade | 82% |
| Destino | Supabase Storage (bucket `vehicles`) |

---

## Deploy em Produção

### Backend (sugestões)

- **Railway / Render / Fly.io** — plataformas PaaS que suportam Node.js com variáveis de ambiente via painel
- Configurar todas as variáveis do `.env` na plataforma escolhida
- O servidor escuta na porta definida por `process.env.PORT` (compatível com todas as plataformas)

### Frontend (sugestões)

- **Vercel / Netlify / GitHub Pages** — hospedagem estática gratuita
- Após deploy, atualizar `FRONTEND_URL` no backend para o domínio do frontend
- Atualizar `API_URL` em `script.js`, `estoque.js` e `veiculo.js` para a URL do backend em produção:

```js
// Alterar em cada arquivo JS do frontend:
const API_URL = "https://seu-backend.railway.app/api";
```

### Checklist de Produção

- [ ] Variáveis de ambiente configuradas na plataforma de deploy
- [ ] `FRONTEND_URL` apontando para o domínio real
- [ ] `API_URL` nos arquivos JS do frontend apontando para o backend em produção
- [ ] Migration executada no banco Supabase de produção
- [ ] Bucket `vehicles` criado e público no Supabase Storage
- [ ] Primeiro admin criado via `/api/auth/setup`
- [ ] Número de WhatsApp correto: `5586994133034`
