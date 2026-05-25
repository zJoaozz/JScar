---
tags: [jscar, visao-geral]
---

# JSCar — Visão Geral do Projeto

> Sistema de loja de seminovos com catálogo online, painel administrativo e integração com WhatsApp.

## Descrição

A JSCar é uma aplicação web para compra e venda de veículos seminovos em Teresina–PI. O site permite que visitantes naveguem pelo catálogo, filtrem por categoria, marca e preço, e entrem em contato diretamente via WhatsApp. O painel administrativo permite gerenciar veículos, categorias e configurações da loja.

## Tecnologias Utilizadas

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express 4 |
| Banco de dados | Supabase (PostgreSQL) |
| Armazenamento de imagens | Supabase Storage |
| Autenticação | JWT (jsonwebtoken) + bcryptjs |
| Upload de imagens | Multer + Sharp (conversão WebP) |
| Frontend | HTML5 + CSS3 + JavaScript puro |
| Fontes | Google Fonts — Inter, Bebas Neue |
| Ícones | Bootstrap Icons 1.11 |

## Estrutura de Pastas

```
JScar/
├── JSCar Docs/              ← esta documentação
├── supabase_migration.sql   ← migration completa do banco
├── backend/
│   ├── .env                 ← variáveis de ambiente (não versionar)
│   ├── .env.example
│   ├── server.js            ← ponto de entrada do servidor
│   ├── package.json
│   ├── config/
│   │   └── supabase.js      ← cliente Supabase (service role)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── categoryController.js
│   │   ├── vehicleController.js
│   │   └── settingController.js
│   ├── middleware/
│   │   ├── auth.js          ← verificação JWT
│   │   ├── upload.js        ← multer para veículos
│   │   ├── categoryUpload.js← multer para categorias
│   │   └── compressImages.js← sharp → WebP
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── vehicleRoutes.js
│   │   └── settingRoutes.js
│   └── supabase-schema.sql      ← referência (já incorporado na migration)
│   └── supabase-categories.sql  ← referência
│   └── supabase-security.sql    ← referência
└── frontend/
    ├── index.html / script.js / style.css  ← página inicial
    ├── admin/
    │   ├── admin.html / admin.js / admin.css
    │   └── login.html / login.js
    ├── estoque/
    │   ├── estoque.html / estoque.js / estoque.css
    └── veiculo/
        ├── veiculo.html / veiculo.js / veiculo.css
```

## Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Conta no Supabase com projeto criado
- Migration executada (ver [[banco-de-dados]])

### 1. Instalar dependências

```bash
cd backend
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# editar .env com as credenciais do Supabase
```

Ver todas as variáveis em [[configuracoes]].

### 3. Iniciar o servidor

```bash
npm start
# ou
node server.js
```

O backend sobe em `http://localhost:5000`.

### 4. Abrir o frontend

Abra `frontend/index.html` no navegador ou use um servidor estático (ex: Live Server no VS Code na porta 5500).

---

*Documentação gerada em 2026-05-18. Ver também: [[banco-de-dados]] · [[rotas-api]] · [[frontend]] · [[configuracoes]] · [[erros-e-solucoes]]*
