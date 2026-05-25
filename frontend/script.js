'use strict';

const API_URL = "http://localhost:5000/api";
const API_ORIGIN = API_URL.replace(/\/api$/, '');
const WA = '5586994133034';
let storeWhatsapp = WA;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initHeader();
  initMobileMenu();
  initHeroSearch();
  loadHero();
  loadCategorias();
  loadMapsEmbed();
  initReveal();
  await loadSettings();
  fetchDestaques();
});

function initTheme() {
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  const saved = localStorage.getItem('jscar-theme') || 'dark';
  applyTheme(saved);
  btn?.addEventListener('click', () => applyTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light'));
  function applyTheme(mode) {
    document.body.classList.toggle('light-mode', mode === 'light');
    if (icon) icon.className = mode === 'light' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    localStorage.setItem('jscar-theme', mode);
  }
}

function initHeader() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 60), { passive: true });
}

function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  const overlay = document.getElementById('mobileNavOverlay') || document.getElementById('navOverlay');
  if (!hamburger || !nav || !overlay) return;
  const close = () => {
    hamburger.classList.remove('open');
    nav.classList.remove('open');
    overlay.classList.remove('visible');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };
  const open = () => {
    hamburger.classList.add('open');
    nav.classList.add('open');
    overlay.classList.add('visible');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  };
  hamburger.addEventListener('click', () => nav.classList.contains('open') ? close() : open());
  overlay.addEventListener('click', close);
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}

function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

function initHeroSearch() {
  const input = document.getElementById('heroSearch');
  const btn = document.getElementById('heroSearchBtn');
  const run = () => {
    const q = input?.value.trim();
    window.location.href = `estoque/estoque.html${q ? `?busca=${encodeURIComponent(q)}` : ''}`;
  };
  btn?.addEventListener('click', run);
  input?.addEventListener('keydown', (event) => { if (event.key === 'Enter') run(); });
}

function getCategorias() {
  try {
    return JSON.parse(localStorage.getItem('jscar_categorias') || '["Hatch","Sedan","SUV","Picape"]');
  } catch {
    return ['Hatch', 'Sedan', 'SUV', 'Picape'];
  }
}

function renderCategorias() {
  const container = document.getElementById('categoriasGrid');
  if (!container) return;

  const categorias = getCategorias();

  const iconMap = {
    'hatch': 'bi-car-front-fill',
    'sedan': 'bi-car-front',
    'suv': 'bi-truck-front-fill',
    'picape': 'bi-truck',
    'eletrico': 'bi-lightning-charge-fill',
    'hibrido': 'bi-battery-half',
    'esportivo': 'bi-speedometer2',
    'super': 'bi-speedometer2',
    'superesportivo': 'bi-speedometer2',
    'superesportivos': 'bi-speedometer2',
    'premium': 'bi-gem',
    'minivan': 'bi-people-fill',
    'van': 'bi-bus-front-fill',
    'caminhonete': 'bi-truck-flatbed',
    'conversivel': 'bi-brightness-high-fill',
    'default': 'bi-car-front-fill',
  };

  const descMap = {
    'hatch': 'Compactos e econômicos',
    'sedan': 'Conforto para o dia a dia',
    'suv': 'Espaço e presença',
    'picape': 'Força para qualquer terreno',
    'eletrico': 'Tecnologia e eficiência',
    'hibrido': 'O melhor dos dois mundos',
    'esportivo': 'Desempenho acima de tudo',
    'super': 'Modelos exclusivos',
    'superesportivo': 'Desempenho acima de tudo',
    'superesportivos': 'Desempenho acima de tudo',
    'premium': 'Modelos exclusivos',
    'minivan': 'Espaço para toda a família',
    'van': 'Ideal para transporte',
    'caminhonete': 'Força e versatilidade',
    'conversivel': 'Liberdade em cada curva',
  };

  function normalizeKey(str) {
    return String(str).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function getIcon(nome) {
    return iconMap[normalizeKey(nome)] || iconMap['default'];
  }

  function getDesc(nome) {
    return descMap[normalizeKey(nome)] || '';
  }

  container.innerHTML = categorias.map(cat => {
    const nome = String(cat);
    const desc = getDesc(nome);
    return `<a href="estoque/estoque.html?categoria=${encodeURIComponent(nome.toLowerCase())}" class="categoria-card reveal" aria-label="Ver ${escHtml(nome)}">
      <div class="categoria-icon-wrap">
        <i class="bi ${getIcon(nome)}" aria-hidden="true"></i>
      </div>
      <strong class="categoria-nome">${escHtml(nome)}</strong>
      ${desc ? `<span class="categoria-desc">${escHtml(desc)}</span>` : ''}
      <span class="categoria-link">Ver modelos <i class="bi bi-arrow-right" aria-hidden="true"></i></span>
    </a>`;
  }).join('');

  initReveal();
}

async function loadCategorias() {
  const container = document.getElementById('categoriasGrid');
  if (!container) return;

  container.innerHTML = '<div class="loading-state"><i class="bi bi-arrow-repeat spin"></i><span>Carregando categorias...</span></div>';

  try {
    const res = await fetch(`${API_URL}/categories`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao carregar categorias');
    const categorias = json.data || [];
    container.innerHTML = categorias.map(renderCategoriaCard).join('');
  } catch (err) {
    console.error('Erro ao carregar categorias:', err);
    container.innerHTML = '';
  }

  initCategoriasCarousel();
}

function renderCategoriaCard(cat) {
  const image = cat.image_url || cat.imageUrl || '';
  const bg = image
    ? `<div class="cat-card-bg" style="background-image:url('${escAttr(getImageSrc(image))}')" aria-hidden="true"></div>`
    : `<div class="cat-card-bg" aria-hidden="true"></div>`;
  return `<a href="estoque/estoque.html?categoria=${encodeURIComponent(cat.slug)}" class="categoria-card" aria-label="Ver ${escHtml(cat.name)}" draggable="false">
    ${bg}
    <div class="cat-card-overlay" aria-hidden="true"></div>
    <div class="cat-card-body">
      <strong class="cat-card-nome">${escHtml(cat.name)}</strong>
      ${cat.description ? `<span class="cat-card-desc">${escHtml(cat.description)}</span>` : ''}
    </div>
  </a>`;
}

function initCategoriasCarousel() {
  const track = document.getElementById('categoriasGrid');
  if (!track) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasDragged = false;

  track.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDown = true;
    hasDragged = false;
    startX = e.pageX - track.getBoundingClientRect().left;
    scrollLeft = track.scrollLeft;
    track.classList.add('dragging');
  });

  document.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('dragging');
  });

  track.addEventListener('mouseleave', () => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('dragging');
  });

  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.getBoundingClientRect().left;
    const walk = x - startX;
    if (Math.abs(walk) > 4) hasDragged = true;
    track.scrollLeft = scrollLeft - walk;
  });

  // Cancela o click se o usuário arrastou (não clicou)
  track.addEventListener('click', (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged = false;
    }
  }, true);

  // Touch support
  let touchStartX = 0;
  let touchScrollLeft = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchScrollLeft = track.scrollLeft;
    hasDragged = false;
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    const walk = touchStartX - e.touches[0].clientX;
    if (Math.abs(walk) > 4) hasDragged = true;
    track.scrollLeft = touchScrollLeft + walk;
  }, { passive: true });

  // Setas de navegação
  document.getElementById('catPrev')?.addEventListener('click', () => {
    track.scrollBy({ left: -300, behavior: 'smooth' });
  });
  document.getElementById('catNext')?.addEventListener('click', () => {
    track.scrollBy({ left: 300, behavior: 'smooth' });
  });
}

function loadMapsEmbed() {
  const defaultUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3974.0023795760553!2d-42.81255122415331!3d-5.103312394873658!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x78e37544c6e9911%3A0x4d93a721cb1a286d!2sJS%20CAR!5e0!3m2!1spt-BR!2sus!4v1778111361018!5m2!1spt-BR!2sus";
  const savedUrl = localStorage.getItem('jscar_maps_url');
  const mapsUrl = savedUrl && savedUrl.includes('google.com/maps/embed') ? savedUrl : defaultUrl;
  const iframe = document.getElementById('mapsEmbed');
  if (iframe) iframe.src = mapsUrl;
}

function renderSkeletons(container, n = 6) {
  container.innerHTML = Array.from({ length: n }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line full"></div>
      </div>
    </div>`).join('');
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_URL}/settings`);
    const settings = await res.json();
    if (!res.ok) return;

    const phone = normalizePhone(settings.whatsapp);
    if (phone) {
      storeWhatsapp = settings.whatsapp;
      document.querySelectorAll('[data-dynamic="wa"]').forEach(el => {
        const msg = el.dataset.waMsg || 'Olá! Quero atendimento da JScar.';
        el.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      });
      const formatted = formatPhone(phone);
      const telEl = document.getElementById('locTelefone');
      if (telEl) telEl.textContent = formatted;
      const waTextEl = document.getElementById('contatoWaText');
      if (waTextEl) waTextEl.textContent = formatted;
    }

    if (settings.instagram) {
      document.querySelectorAll('[data-dynamic="ig"]').forEach(el => {
        el.href = settings.instagram;
      });
      const handle = extractIgHandle(settings.instagram);
      const igTextEl = document.getElementById('contatoIgText');
      if (igTextEl && handle) igTextEl.textContent = `@${handle}`;
    }

    const address = [settings.endereco, settings.cidade].filter(Boolean).join(' — ');
    if (address) {
      const addrEl = document.getElementById('locEndereco');
      if (addrEl) addrEl.textContent = address;
    }
  } catch {
    storeWhatsapp = WA;
  }
}

function formatPhone(digits) {
  if (digits.length === 13) return `(${digits.slice(2, 4)}) ${digits.slice(4, 5)} ${digits.slice(5, 9)}-${digits.slice(9)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

function extractIgHandle(url) {
  const match = String(url || '').match(/instagram\.com\/([^/?#]+)/);
  return match ? match[1] : null;
}

function initCardImages() {
  document.querySelectorAll('.card-img').forEach(img => {
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'));
      img.addEventListener('error', () => {
        img.src = 'https://picsum.photos/600/400?random=' + Math.floor(Math.random() * 100);
        img.classList.add('loaded');
      });
    }
  });
}

async function fetchDestaques() {
  const grid = document.getElementById('destaqueGrid') || document.getElementById('destaquesGrid');
  if (!grid) return;
  renderSkeletons(grid, 6);
  try {
    const res = await fetch(`${API_URL}/vehicles?destaque=true&limit=6&ordenacao=recente`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Erro ao carregar destaques');
    const vehicles = json.data || json.vehicles || json || [];
    grid.innerHTML = vehicles.length
      ? vehicles.map((v) => buildCard(v, 'veiculo/')).join('')
      : `<div class="empty-state"><i class="bi bi-star"></i><h3>Nenhum destaque cadastrado</h3><p>Marque veículos como destaque no painel admin.</p></div>`;
    initCardImages();
  } catch (err) {
    console.error('Erro ao carregar destaques:', err);
    grid.innerHTML = `<div class="empty-state"><i class="bi bi-exclamation-circle"></i><h3>Erro ao carregar veículos</h3><p>Verifique se o backend está rodando.</p></div>`;
  }
}

async function loadHero() {
  try {
    let res = await fetch(`${API_URL}/vehicles?hero=true&limit=1`);
    let data = await res.json();
    let vehicles = data.data || data.vehicles || data || [];

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      res = await fetch(`${API_URL}/vehicles?limit=1&ordenacao=recente`);
      data = await res.json();
      vehicles = data.data || data.vehicles || data || [];
    }

    if (Array.isArray(vehicles) && vehicles[0]) renderHero(vehicles[0]);
  } catch (err) {
    console.error('Erro ao carregar hero:', err);
  }
}

function renderHero(v) {
  const heroImg = document.getElementById('heroMainImage');
  if (heroImg) {
    heroImg.src = getImageUrl(v);
    heroImg.alt = v.titulo || 'Veiculo em destaque';
  }

  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');
  if (heroTitle) heroTitle.textContent = v.titulo || '';
  if (heroSubtitle) {
    heroSubtitle.textContent = `${formatPreco(v.preco)}${v.km ? ` • ${v.km} km` : ''}${v.cidade ? ` • ${v.cidade}` : ''}`;
  }

  setupHeroSlider(v);
}

function setupHeroSlider(v) {
  const slider = document.getElementById('heroSlider');
  const dots = document.getElementById('heroDots');
  if (!slider || !dots) return;

  const images = getVehicleImages(v).length ? getVehicleImages(v) : [{ url: getImageUrl(v) }];
  let current = 0;

  const heroId = v.id || v._id;
  slider.innerHTML = images.map((img, i) => {
    const src = getImageSrc(img);
    return `<div class="hero-slide ${i === 0 ? 'active' : ''}">
      <a href="veiculo/veiculo.html?id=${escHtml(heroId)}"><img src="${escHtml(src)}" alt="${escHtml(v.titulo)}" loading="${i === 0 ? 'eager' : 'lazy'}"></a>
      <div class="hero-slide-info"><span class="slide-title">${escHtml(v.titulo)}</span><span class="slide-price">${formatPreco(v.preco)}</span></div>
    </div>`;
  }).join('');

  dots.innerHTML = images.map((_, i) => `<button class="slider-dot ${i === 0 ? 'active' : ''}" aria-label="Slide ${i + 1}"></button>`).join('');

  const go = (idx) => {
    current = (idx + images.length) % images.length;
    slider.querySelectorAll('.hero-slide').forEach((el, i) => el.classList.toggle('active', i === current));
    dots.querySelectorAll('.slider-dot').forEach((el, i) => el.classList.toggle('active', i === current));
  };

  document.getElementById('heroPrev')?.addEventListener('click', () => go(current - 1));
  document.getElementById('heroNext')?.addEventListener('click', () => go(current + 1));
  dots.querySelectorAll('.slider-dot').forEach((dot, i) => dot.addEventListener('click', () => go(i)));

  if (window.heroSliderTimer) clearInterval(window.heroSliderTimer);
  if (images.length > 1) window.heroSliderTimer = setInterval(() => go(current + 1), 4000);
}

function buildCard(v, basePath = '') {
  const id = v.id || v._id;
  const statusBadge = v.status && v.status !== 'disponivel'
    ? `<span class="badge-status ${escHtml(v.status)}">${escHtml(labelStatus(v.status))}</span>`
    : '';
  const whatsappLink = buildWhatsappLink(v);
  return `<article class="vehicle-card">
    <div class="card-img-link">
      ${statusBadge}
      <a href="${basePath}veiculo.html?id=${escHtml(id)}"><img class="card-img" src="${escHtml(getImageUrl(v))}" alt="${escHtml(v.titulo)}" loading="lazy"></a>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escHtml(v.titulo)}</h3>
      <div class="card-specs">
        <span><i class="bi bi-calendar3"></i>${escHtml(v.ano)}</span>
        <span><i class="bi bi-speedometer2"></i>${escHtml(v.km)}</span>
        <span><i class="bi bi-fuel-pump"></i>${escHtml(v.combustivel)}</span>
      </div>
      <div class="card-price">${formatPreco(v.preco)}</div>
      <div class="card-actions">
        <a class="btn-wa" href="${escHtml(whatsappLink)}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="bi bi-whatsapp"></i></a>
        <a class="btn-details" href="${basePath}veiculo.html?id=${escHtml(id)}">Ver detalhes</a>
      </div>
    </div>
  </article>`;
}

function getImageUrl(v) {
  const url = getImageSrc(getVehicleImages(v)[0] || v.imagem || v.image);
  if (!url) return 'https://picsum.photos/600/400?random=8';
  return url;
}

function getVehicleImages(v) {
  const images = Array.isArray(v.images) && v.images.length ? v.images : v.imagens;
  return Array.isArray(images) ? images : [];
}

function getImageSrc(image) {
  const url = typeof image === 'string' ? image : image?.url || '';
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildVehicleName(v) {
  const title = String(v.titulo || '').trim();
  if (!title) {
    return [v.marca, v.modelo, v.ano].map((item) => String(item || '').trim()).filter(Boolean).join(' ') || 'veículo';
  }
  const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const titleKey = normalize(title);
  const parts = [];
  if (v.marca && !titleKey.includes(normalize(v.marca))) parts.push(v.marca);
  if (v.modelo && !titleKey.includes(normalize(v.modelo))) parts.push(v.modelo);
  parts.push(title);
  if (v.ano && !titleKey.includes(normalize(v.ano))) parts.push(v.ano);
  return parts.map((item) => String(item || '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function buildWhatsappLink(v) {
  const phone = normalizePhone(v.whatsapp) || normalizePhone(storeWhatsapp) || WA;
  const message = `Olá! Tenho interesse na ${buildVehicleName(v)}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatPreco(preco) {
  const n = Number(String(preco || '').replace(/[^\d]/g, '')) / (String(preco || '').includes(',') ? 100 : 1);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function labelStatus(status) {
  return { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido' }[status] || status;
}

function emptyState(message = 'Nenhum veículo encontrado.') {
  return `<div class="empty-state"><i class="bi bi-car-front-fill"></i><h3>${escHtml(message)}</h3><p>Confira o estoque completo ou fale com a loja.</p></div>`;
}

function escHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
