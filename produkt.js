const detail = document.querySelector('#product-detail-content');
const slug = new URLSearchParams(location.search).get('slug');
const escapeDetail = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

async function showProduct() {
  if (!slug) {
    detail.innerHTML = '<div class="detail-content"><h1>Chýba produkt</h1><p>Vráť sa do e-shopu a vyber si produkt.</p><a class="button button-dark" href="obchod.html">Otvoriť e-shop</a></div>';
    return;
  }
  try {
    const response = await fetch(`/api/products?slug=${encodeURIComponent(slug)}`);
    const result = await response.json();
    if (!response.ok || !result.product) throw new Error('Tento produkt sa nenašiel alebo už nie je zverejnený.');
    const product = result.product;
    const variants = JSON.parse(product.variants_json || '[]');
    const image = product.image_url
      ? `<img src="${escapeDetail(product.image_url)}" alt="${escapeDetail(product.name)}" loading="eager">`
      : '<span class="product-shape shape-stand" aria-hidden="true"></span><span class="detail-caption">ILUSTRAČNÁ UKÁŽKA</span>';
    const details = [product.material && `Materiál: ${escapeDetail(product.material)}`, product.dimensions && `Rozmery: ${escapeDetail(product.dimensions)}`].filter(Boolean).join(' · ');
    document.title = `${product.name} | tvojVýtlačok`;
    document.querySelector('meta[name="description"]').content = product.description.slice(0, 155);
    document.querySelector('#product-breadcrumb').textContent = product.name;
    detail.innerHTML = `<div class="detail-visual">${image}</div><div class="detail-content"><span class="product-category">${escapeDetail(product.category)}</span><h1>${escapeDetail(product.name)}</h1><p>${escapeDetail(product.description).replace(/\n/g, '<br>')}</p>${details ? `<p class="product-facts">${details}</p>` : ''}<p class="detail-price">${escapeDetail(product.price_text || 'Cena na doplnenie')}</p><span class="detail-status">${escapeDetail(product.availability_text || 'Dostupnosť na potvrdenie')}</span>${variants.length ? `<label class="detail-field">Variant<select>${variants.map((variant) => `<option>${escapeDetail(variant)}</option>`).join('')}</select></label>` : ''}<button type="button" class="button button-dark" data-product-add>Pridať do ukážkového košíka</button><p class="detail-honesty">Košík je zatiaľ iba ukážkový. Objednávky a platby nie sú aktívne.</p></div>`;
    document.querySelector('[data-product-add]').addEventListener('click', () => {
      const key = 'tvojVytlacokCart';
      let cart = [];
      try { cart = JSON.parse(localStorage.getItem(key) || '[]'); } catch { cart = []; }
      const item = cart.find((entry) => entry.id === product.id);
      item ? item.qty++ : cart.push({ id: product.id, qty: 1 });
      localStorage.setItem(key, JSON.stringify(cart));
      const count = document.querySelector('#cart-count');
      if (count) count.textContent = String(cart.reduce((sum, entry) => sum + entry.qty, 0));
      document.querySelector('.detail-honesty').textContent = 'Produkt je v ukážkovom košíku. Toto ešte nie je objednávka.';
    });
  } catch (error) {
    detail.innerHTML = `<div class="detail-content"><h1>Produkt sa nepodarilo otvoriť</h1><p>${escapeDetail(error.message)}</p><a class="button button-dark" href="obchod.html">Späť do e-shopu</a></div>`;
  }
}

showProduct();
