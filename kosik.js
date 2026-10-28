// Košík a objednávka na dobierku. Používa safeCart, CART_KEY, escapeHtml, formatEuro, updateCount a announce z app.js.
const cartPanel = document.querySelector('#cart-content');
const checkoutForm = document.querySelector('#checkout-form');
const shippingBox = document.querySelector('#shipping-options');
const pickupField = document.querySelector('#pickup-field');
const summary = document.querySelector('#order-summary');
const checkoutFeedback = document.querySelector('#checkout-feedback');
let cartProducts = new Map();
let shop = { shipping: [], cod_fee_cents: 0, packeta_api_key: '' };
const packetaButton = document.querySelector('#packeta-pick');
let packetaLoading = null;

function loadPacketa() {
  packetaLoading ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://widget.packeta.com/v6/www/js/library.js';
    script.onload = resolve;
    script.onerror = () => { packetaLoading = null; reject(new Error('Mapu Packety sa nepodarilo načítať.')); };
    document.head.append(script);
  });
  return packetaLoading;
}

// With a Packeta API key the customer picks the point on Packeta's map; without it they type it in.
function setupPacketa() {
  if (!shop.packeta_api_key) return;
  const input = checkoutForm.elements.pickup_point;
  packetaButton.hidden = false;
  input.readOnly = true;
  input.placeholder = 'Zatiaľ nevybraté';
  document.querySelector('#pickup-hint').textContent = 'Kliknite na tlačidlo a vyberte výdajné miesto alebo Z-BOX na mape.';
  input.addEventListener('click', () => packetaButton.click());
}

packetaButton.addEventListener('click', async () => {
  try {
    await loadPacketa();
    Packeta.Widget.pick(shop.packeta_api_key, (point) => {
      if (!point) return;
      checkoutForm.elements.pickup_point.value = point.formatedValue || [point.name, point.street, point.zip, point.city].filter(Boolean).join(', ');
      checkoutForm.elements.pickup_point_id.value = String(point.id || '');
      packetaButton.textContent = 'Zmeniť výdajné miesto';
    }, { country: 'sk', language: 'sk', appIdentity: 'tvoj-vytlacok' });
  } catch (error) {
    checkoutFeedback.textContent = error.message;
  }
});

const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart.filter((item) => item.qty > 0)));
  updateCount();
  renderCheckout();
};

// Drop items that are no longer for sale and cap quantities at what is in stock.
function cleanCart() {
  const cart = safeCart();
  const used = new Map();
  const next = [];
  for (const entry of cart) {
    const product = cartProducts.get(entry.id);
    if (!product || !Number.isInteger(product.price_cents)) continue;
    const left = Number.isInteger(product.stock) ? product.stock - (used.get(entry.id) || 0) : Infinity;
    const qty = Math.min(entry.qty, left);
    if (qty < 1) continue;
    used.set(entry.id, (used.get(entry.id) || 0) + qty);
    next.push({ id: entry.id, qty, variant: entry.variant || '' });
  }
  if (JSON.stringify(next) !== JSON.stringify(cart)) localStorage.setItem(CART_KEY, JSON.stringify(next));
  updateCount();
  return next;
}

function selectedShipping() {
  const id = checkoutForm.elements.shipping?.value;
  return shop.shipping.find((method) => method.id === id) || null;
}

function renderSummary(cart) {
  const itemsCents = cart.reduce((sum, entry) => sum + cartProducts.get(entry.id).price_cents * entry.qty, 0);
  const shipping = selectedShipping();
  const rows = [
    ['Tovar', formatEuro(itemsCents)],
    ['Doprava', shipping ? formatEuro(shipping.price_cents) : 'vyberte dopravu'],
    ['Dobierka', formatEuro(shop.cod_fee_cents)],
  ];
  const total = itemsCents + (shipping?.price_cents || 0) + shop.cod_fee_cents;
  summary.innerHTML = rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')
    + `<div class="summary-total"><dt>Spolu na dobierku</dt><dd>${shipping ? formatEuro(total) : '—'}</dd></div>`;
}

function renderCheckout() {
  const cart = cleanCart();
  if (!cart.length) {
    cartPanel.innerHTML = '<div class="cart-empty-state"><span class="empty-mark">＋</span><h2>Košík je zatiaľ prázdny.</h2><p>Vyberte si niečo v e-shope a pridajte to do košíka.</p><a class="button button-dark" href="obchod.html">Prejsť do e-shopu ↗</a></div>';
    checkoutForm.hidden = true;
    return;
  }
  cartPanel.innerHTML = `<h2 class="cart-heading">V košíku</h2><ul class="cart-lines">${cart.map((entry, index) => {
    const product = cartProducts.get(entry.id);
    const href = `produkt.html?slug=${encodeURIComponent(product.slug)}`;
    const thumb = product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="" width="88" height="88" loading="lazy" decoding="async">` : '<span class="cart-thumb-empty" aria-hidden="true">3D</span>';
    const inCart = cart.filter((item) => item.id === entry.id).reduce((sum, item) => sum + item.qty, 0);
    const atLimit = Number.isInteger(product.stock) && inCart >= product.stock;
    const stock = Number.isInteger(product.stock) ? `<span class="cart-stock">Na sklade ${product.stock} ks</span>` : '';
    return `<li class="cart-line"><a class="cart-line-thumb" href="${escapeHtml(href)}" tabindex="-1">${thumb}</a>
      <div class="cart-line-info"><a href="${escapeHtml(href)}"><b>${escapeHtml(product.name)}</b></a>${entry.variant ? `<span>Variant: ${escapeHtml(entry.variant)}</span>` : ''}<span>${formatEuro(product.price_cents)} / ks</span>${stock}</div>
      <div class="cart-line-qty" role="group" aria-label="Počet kusov: ${escapeHtml(product.name)}"><button type="button" data-step="-1" data-line="${index}" aria-label="Ubrať jeden kus">−</button><span aria-live="polite">${entry.qty}</span><button type="button" data-step="1" data-line="${index}" aria-label="Pridať jeden kus"${atLimit ? ' disabled' : ''}>+</button></div>
      <b class="cart-line-total">${formatEuro(product.price_cents * entry.qty)}</b>
      <button type="button" class="cart-line-remove" data-remove-line="${index}">Odstrániť</button></li>`;
  }).join('')}</ul>`;
  checkoutForm.hidden = false;
  renderSummary(cart);
}

cartPanel.addEventListener('click', (event) => {
  const step = event.target.closest('[data-step]');
  const remove = event.target.closest('[data-remove-line]');
  if (!step && !remove) return;
  const cart = cleanCart();
  if (step) cart[Number(step.dataset.line)].qty += Number(step.dataset.step);
  else cart.splice(Number(remove.dataset.removeLine), 1);
  saveCart(cart);
});

checkoutForm.addEventListener('change', (event) => {
  if (event.target.name !== 'shipping') return;
  const shipping = selectedShipping();
  pickupField.hidden = !shipping?.pickup;
  checkoutForm.elements.pickup_point.required = Boolean(shipping?.pickup);
  renderSummary(cleanCart());
});

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!checkoutForm.reportValidity()) return;
  // A read-only field skips the browser's required check, so check the map choice here.
  if (selectedShipping()?.pickup && !checkoutForm.elements.pickup_point.value.trim()) {
    checkoutFeedback.textContent = 'Vyberte výdajné miesto Packety.';
    (shop.packeta_api_key ? packetaButton : checkoutForm.elements.pickup_point).focus();
    return;
  }
  const cart = cleanCart();
  if (!cart.length) return renderCheckout();
  const data = Object.fromEntries(new FormData(checkoutForm));
  const submit = checkoutForm.querySelector('[type="submit"]');
  submit.disabled = true;
  checkoutFeedback.textContent = 'Odosielam objednávku…';
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart,
        shipping: data.shipping,
        consent: checkoutForm.elements.consent.checked,
        website: data.website,
        customer: { name: data.name, email: data.email, phone: data.phone, street: data.street, city: data.city, zip: data.zip, note: data.note, pickup_point: data.pickup_point, pickup_point_id: data.pickup_point_id },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Objednávku sa nepodarilo odoslať. Skúste to znova.');
    localStorage.removeItem(CART_KEY);
    updateCount();
    checkoutForm.hidden = true;
    cartPanel.innerHTML = `<div class="cart-empty-state order-done"><span class="empty-mark">✓</span><h2>Ďakujeme, objednávka je prijatá.</h2><p>Číslo objednávky: <b>${escapeHtml(result.number)}</b><br>Pri prevzatí zaplatíte <b>${formatEuro(result.total_cents)}</b>.</p><p>Ozveme sa vám e-mailom, keď balík odošleme.</p><a class="button button-dark" href="obchod.html">Späť do e-shopu</a></div>`;
    cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    announce('Objednávka bola odoslaná.');
  } catch (error) {
    checkoutFeedback.textContent = error.message;
    if (/obnovte/i.test(error.message)) loadCheckout();
  } finally {
    submit.disabled = false;
  }
});

async function loadCheckout() {
  try {
    const [productsResponse, shopResponse] = await Promise.all([fetch('/api/products'), fetch('/api/shop')]);
    const products = (await productsResponse.json()).products || [];
    shop = await shopResponse.json();
    cartProducts = new Map(products.map((product) => [product.id, product]));
    shippingBox.innerHTML = shop.shipping.map((method) => `<label class="shipping-option"><input type="radio" name="shipping" value="${escapeHtml(method.id)}" required><span>${escapeHtml(method.label)}</span><b>${formatEuro(method.price_cents)}</b></label>`).join('');
    setupPacketa();
    renderCheckout();
  } catch {
    cartPanel.innerHTML = '<div class="cart-empty-state"><h2>Košík sa nepodarilo načítať.</h2><p>Skúste obnoviť stránku.</p></div>';
  }
}

loadCheckout();
