const detail = document.querySelector('#product-detail-content');
const slug = new URLSearchParams(location.search).get('slug');
const INSTAGRAM_URL = 'https://www.instagram.com/tvojvytlacok/';
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
    const stockText = Number.isInteger(product.stock) ? `Na sklade: ${product.stock} ks` : (product.availability_text || 'Dostupnosť na dopyt');
    document.title = `${product.name} | tvojVýtlačok`;
    document.querySelector('meta[name="description"]').content = product.description.slice(0, 155);
    document.querySelector('#product-breadcrumb').textContent = product.name;
    detail.innerHTML = `<div class="detail-visual">${image}</div><div class="detail-content"><span class="product-category">${escapeDetail(product.category)}</span><h1>${escapeDetail(product.name)}</h1><p>${escapeDetail(product.description).replace(/\n/g, '<br>')}</p>${details ? `<p class="product-facts">${details}</p>` : ''}<p class="detail-price">${escapeDetail(productPrice(product))}</p><span class="detail-status">${escapeDetail(stockText)}</span><div class="detail-buy"><a class="button button-dark" href="#zaujem">Mám záujem</a><a class="button button-light" href="${INSTAGRAM_URL}" target="_blank" rel="noopener">Napísať na Instagram ↗</a></div><p class="detail-honesty">Cez web sa zatiaľ nedá objednať ani platiť. Pošlite krátky dopyt alebo nám napíšte na Instagram @tvojvytlacok a dohodneme doručenie aj platbu.</p></div>`;
    renderInterestForm(product, variants);
  } catch (error) {
    detail.innerHTML = `<div class="detail-content"><h1>Produkt sa nepodarilo otvoriť</h1><p>${escapeDetail(error.message)}</p><a class="button button-dark" href="obchod.html">Späť do e-shopu</a></div>`;
  }
}

// Interest form under the product: it goes to the same inquiries API as dopyt.html, with the product filled in.
function renderInterestForm(product, variants) {
  const section = document.querySelector('#zaujem');
  section.hidden = false;
  section.innerHTML = `<form class="inquiry-form" id="product-inquiry"><div class="form-title"><h3>Mám záujem o: ${escapeDetail(product.name)}</h3><span>Polia s * sú povinné</span></div><div class="field-row"><label>Meno a priezvisko *<input name="name" autocomplete="name" required placeholder="Ako vás oslovujeme?"></label><label>E-mail *<input name="email" type="email" autocomplete="email" required placeholder="vas@email.sk"></label></div><div class="field-row"><label>Telefón<input name="phone" type="tel" autocomplete="tel" placeholder="+421 …"></label><label>Počet kusov<input name="quantity" type="number" min="1" value="1"></label></div>${variants.length ? `<label>Variant<select name="variant">${variants.map((variant) => `<option>${escapeDetail(variant)}</option>`).join('')}</select></label>` : ''}<label>Správa<textarea name="message" rows="3" placeholder="Napríklad farba, kam to poslať alebo otázka k výrobku…"></textarea></label><label class="hp-field" aria-hidden="true">Web<input name="website" tabindex="-1" autocomplete="off"></label><label class="consent"><input type="checkbox" name="consent" required><span>Súhlasím so <a href="ochrana-udajov.html">spracovaním uvedených údajov</a> na účel odpovede na môj dopyt. *</span></label><button class="button button-dark form-submit" type="submit">Odoslať dopyt <span>↗</span></button><p class="form-feedback" aria-live="polite"></p><p class="privacy-note">Odoslanie dopytu nie je objednávka a k ničomu vás nezaväzuje. Ozveme sa vám e-mailom.</p></form>`;
  const form = section.querySelector('form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = form.querySelector('.form-feedback');
    const submit = form.querySelector('[type="submit"]');
    const data = Object.fromEntries(new FormData(form));
    const lines = [`Záujem o produkt: ${product.name}${data.variant ? ` (${data.variant})` : ''}`, `Cena na webe: ${productPrice(product)}`, `Počet kusov: ${data.quantity || 1}`];
    if (data.message.trim()) lines.push('', data.message.trim());
    submit.disabled = true;
    feedback.textContent = 'Odosielam dopyt…';
    try {
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.name, email: data.email, phone: data.phone, quantity: data.quantity, description: lines.join('\n'), website: data.website, consent: form.elements.consent.checked }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Dopyt sa nepodarilo odoslať. Skúste to znova.');
      form.reset();
      feedback.textContent = 'Ďakujeme, dopyt sme prijali. Ozveme sa vám e-mailom.';
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  if (location.hash === '#zaujem') section.scrollIntoView();
}

showProduct();
