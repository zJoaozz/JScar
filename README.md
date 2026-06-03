# 🚗 JScar — Seminovos com Procedência

> Plataforma web completa para loja de veículos seminovos em Teresina–PI.

![JScar](https://img.shields.io/badge/JScar-v1.0-yellow?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

---

## 📋 Sobre o Projeto

A **JScar** é uma plataforma de compra e venda de veículos seminovos. O site permite que visitantes naveguem pelo catálogo, filtrem veículos por categoria, marca e preço, e entrem em contato diretamente via WhatsApp. O painel administrativo permite gerenciar veículos, categorias e configurações da loja.

---

## ✨ Funcionalidades

### 🌐 Site Público
- Página inicial com hero, destaques e categorias
- Catálogo de veículos com filtros avançados
- Página de detalhe do veículo com galeria de fotos
- Contato direto via WhatsApp
- Tema claro/escuro
- Design responsivo (mobile-first)

### 🔐 Painel Administrativo
- Login seguro com JWT
- Dashboard com estatísticas
- CRUD completo de veículos
- Upload de até 15 imagens por veículo (convertidas para WebP)
- Gerenciamento de categorias
- Configurações da loja

---

## 🚀 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript puro |
| Backend | Node.js + Express |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | JWT + bcryptjs |
| Upload de imagens | Multer + Sharp (WebP) |
| Ícones | Bootstrap Icons 1.11 |
| Fontes | Inter + Bebas Neue |

---

## 📁 Estrutura do Projeto

```
JScar/
├── frontend/
│   ├── index.html          ← Página inicial
│   ├── script.js
│   ├── style.css
│   ├── estoque/            ← Catálogo de veículos
│   ├── veiculo/            ← Detalhe do veículo
│   └── admin/              ← Painel administrativo
├── backend/
│   ├── server.js           ← Ponto de entrada
│   ├── package.json
│   ├── .env.example        ← Modelo de variáveis
│   ├── config/
│   │   └── supabase.js     ← Configuração do Supabase
│   ├── controllers/        ← Lógica de negócio
│   ├── routes/             ← Rotas da API
│   └── middleware/         ← Auth, upload, compressão
└── .gitignore
```

---

## ⚙️ Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Conta no Supabase

### 1. Clone o repositório
```bash
git clone https://github.com/zJoaozz/JScar.git
cd JScar
```

### 2. Instale as dependências
```bash
cd backend
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:
```env
PORT=5000
JWT_SECRET=seu_secret_aqui
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
SUPABASE_BUCKET=vehicles
FRONTEND_URL=http://localhost:5500
```

### 4. Inicie o servidor
```bash
npm start
```

### 5. Abra o frontend
Abra `frontend/index.html` com o Live Server na porta 5500.

---

## 🔗 API — Principais Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/vehicles` | Listar veículos |
| GET | `/api/vehicles/:id` | Detalhe do veículo |
| POST | `/api/vehicles` | Criar veículo (auth) |
| PUT | `/api/vehicles/:id` | Editar veículo (auth) |
| DELETE | `/api/vehicles/:id` | Deletar veículo (auth) |
| GET | `/api/categories` | Listar categorias |
| POST | `/api/auth/login` | Login admin |

---

## 📞 Contato

- 🌐 **Site:** Em breve
- 📸 **Instagram:** [@js_carpi](https://instagram.com/js_carpi)
- 💬 **WhatsApp:** [+55 86 99413-3034](https://wa.me/5586994133034)
- 📍 **Localização:** Teresina – PI

---

## 👨‍💻 Desenvolvido por

**TriCod3x** — Soluções em tecnologia

---

*© 2026 JScar. Todos os direitos reservados.*
