---
tags: [jscar, frontend, html, css, javascript]
---

# Frontend — Interface do Usuário

> HTML5 + CSS3 + JavaScript puro. Sem frameworks. Comunicação com o backend via `fetch` para a API REST.

Ver também: [[rotas-api]] · [[index]]

---

## Páginas

### 1. Página Inicial — `frontend/index.html`

**Arquivos:** `index.html` · `script.js` · `style.css`

| Seção | ID/Classe | Descrição |
|-------|-----------|-----------|
| Header fixo | `.header` | Logo, nav, botão WhatsApp, toggle de tema |
| Hero | `#inicio` | Slider de veículo em destaque, busca rápida |
| Categorias | `#categorias` | Carrossel horizontal com drag-to-scroll |
| Destaques | `#destaques` | Grid de veículos marcados como destaque |
| CTA strip | `.cta-strip` | Banner de call-to-action para WhatsApp |
| Por que JSCar | `#porque` | 4 cards de diferenciais |
| Localização | `#localizacao` | Informações + iframe do Google Maps |
| Contato | `#contato` | Cards de WhatsApp e Instagram |
| Footer | `.footer` | Links rápidos, redes sociais, copyright |
| Float WhatsApp | `.wa-float` | Botão flutuante fixo no canto inferior direito |

**Funções principais em `script.js`:**

```js
loadCategorias()      // busca /api/categories e renderiza o carrossel
loadHero()            // busca veículo hero e monta o slider
fetchDestaques()      // busca /api/vehicles?destaque=true
loadSettings()        // busca /api/settings e atualiza links de WhatsApp
initCategoriasCarousel() // drag-to-scroll + setas < >
initReveal()          // animações de entrada com IntersectionObserver
initTheme()           // alterna tema claro/escuro (localStorage)
```

---

### 2. Estoque — `frontend/estoque/estoque.html`

**Arquivos:** `estoque.html` · `estoque.js` · `estoque.css`

Página de listagem e filtragem de veículos.

| Elemento | Descrição |
|----------|-----------|
| Filtro de busca | Campo texto + filtros por marca, combustível, categoria, preço |
| Grid de veículos | Cards responsivos com foto, specs e preço |
| Paginação | Botões anterior/próximo |
| Estado vazio | Exibido quando nenhum veículo é encontrado |

**Query params suportados via URL:**

```
estoque.html?busca=honda&categoria=suv&marca=honda&combustivel=flex&preco_min=30000&preco_max=80000
```

---

### 3. Detalhe do Veículo — `frontend/veiculo/veiculo.html`

**Arquivos:** `veiculo.html` · `veiculo.js` · `veiculo.css`

Página de um veículo específico, acessada via `?id=<uuid>`.

| Elemento | Descrição |
|----------|-----------|
| Galeria de fotos | Slider com todas as imagens do veículo |
| Especificações | Ano, km, combustível, câmbio, cor, opcionais |
| Preço + botão WA | Contato direto pelo WhatsApp com mensagem pré-preenchida |
| Outros veículos | Grid com outros veículos da mesma categoria |

---

### 4. Admin — `frontend/admin/admin.html`

**Arquivos:** `admin.html` · `admin.js` · `admin.css`

Painel administrativo. Requer login (JWT armazenado em `localStorage`).

| Seção | Descrição |
|-------|-----------|
| Login | `login.html` / `login.js` — autenticação e armazenamento do token |
| Dashboard | Estatísticas do estoque |
| Veículos | CRUD completo: listar, criar, editar, remover, definir destaque/hero, status |
| Categorias | CRUD: listar, criar, editar, reordenar, ativar/desativar |
| Configurações | Nome da loja, WhatsApp, Instagram, endereço |

---

## Arquivos CSS

| Arquivo | Escopo |
|---------|--------|
| `frontend/style.css` | Estilos globais — variáveis, reset, header, hero, categorias, veículos, footer |
| `frontend/estoque/estoque.css` | Estilos específicos da página de estoque |
| `frontend/veiculo/veiculo.css` | Estilos específicos da página de detalhe |
| `frontend/admin/admin.css` | Estilos do painel administrativo |

---

## Variáveis CSS Globais (`style.css`)

```css
:root {
  --bg:           #050505;
  --surface:      #101114;
  --text:         #f5f7fb;
  --muted:        #a6afbd;
  --primary:      #F5C400;      /* dourado JSCar */
  --primary-dark: #D4A800;
  --radius-lg:    24px;
  --container:    1320px;
}
```

---

## Componentes Reutilizáveis

### Cards de Veículo (`buildCard()`)

Gerado dinamicamente em `script.js`, `estoque.js` e `veiculo.js`. Inclui:
- Foto principal (lazy load)
- Badge de status (Disponível / Reservado / Vendido)
- Título, ano, km, combustível
- Preço
- Botões: WhatsApp e Ver detalhes

### Carrossel de Categorias

Implementado via CSS flex + overflow-x + JavaScript puro (sem biblioteca):
- **Drag to scroll** — mouse e touch
- **Setas < >** — scroll de 300px por clique
- **Clique bloqueado se houve drag** (evita navegação acidental)

### Sistema de Toast

`frontend/js/toast.js` — notificações temporárias:
```js
showToast('Mensagem', 'success') // ou 'error' / 'info'
```

### Tema Claro/Escuro

Controlado por `body.light-mode` e `localStorage`. Alternado pelo botão no header.

---

## Fontes Utilizadas

| Fonte | Uso |
|-------|-----|
| Inter (400–800) | Texto geral |
| Bebas Neue | Anteriormente usada nos cards de categoria (removida em revisão) |

---

## WhatsApp — Número da Loja

- **Número real:** `(86) 9 9413-3034`
- **Formato para wa.me:** `5586994133034`
- Definido como constante `WA` em cada arquivo JS e sobrescrito dinamicamente via `GET /api/settings`
