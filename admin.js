const form = document.querySelector('#product-form');
const notice = document.querySelector('#admin-message');
const list = document.querySelector('#product-list');
const count = document.querySelector('#product-count');
const generateButton = document.querySelector('#generate-copy');
let products = [];

function message(text, kind = '') {
  notice.textContent = text;
  notice.dataset.kind = kind;
}

function formData() {
  const data = new FormData(form);
  return {
    id: String(data.get('id') || ''),
    name: String(data.get('name') || '').trim(),
    slug: String(data.get('slug') || '').trim(),
    category: String(data.get('category') || '').trim(),
    material: String(data.get('material') || '').trim(),
    dimensions: String(data.get('dimensions') || '').trim(),
    price_text: String(data.get('price_text') || '').trim(),
    availability_text: String(data.get('availability_text') || '').trim(),
    variants: String(data.get('variants') || '').split('\n').map((item) => item.trim()).filter(Boolean),
    image_url: String(data.get('image_url') || '').trim(),
    notes: String(data.get('notes') || '').trim(),
    description: String(data.get('description') || '').trim(),
    status: String(data.get('status') || 'draft'),
  };
}

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function statusName(status) {
  return ({ draft: 'Koncept', published: 'Zverejnený', archived: 'Archív' })[status] || 'Koncept';
}

function renderProducts() {
  count.textContent = String(products.length);
  if (!products.length) {
    list.innerHTML = '<p class="empty-list">Zatiaľ tu nie je žiadny produkt. Začni formulárom.</p>';
    return;
  }
  list.innerHTML = products.map((product) => `<article class="product-row"><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)} · ${escapeHtml(product.slug)}</p></div><div class="product-row-actions"><span class="status-pill ${escapeHtml(product.status)}">${statusName(product.status)}</span><button class="edit-button" type="button" data-edit="${escapeHtml(product.id)}">Upraviť</button></div></article>`).join('');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Požiadavka zlyhala (${response.status}).`);
  return result;
}

async function loadProducts() {
  try {
    const result = await request('/api/admin/products');
    products = result.products || [];
    renderProducts();
    message('Databáza je pripojená. Môžeš pridávať produkty.', 'success');
  } catch (error) {
    products = [];
    renderProducts();
    message(`${error.message} Pred použitím správcu treba v Cloudflare pripojiť D1, povoliť prístup a nastaviť e-mail správcu.`, 'error');
  }
}

// Shrink photos in the browser so they fit comfortably in a D1 row and load fast.
async function shrinkPhoto(file, maxSide = 1600) {
  if (!file.type.startsWith('image/')) throw new Error('Vyber fotku vo formáte JPG, PNG alebo WebP.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Túto fotku sa nepodarilo otvoriť. Skús JPG alebo PNG.'); });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
}

async function uploadPhoto(file) {
  const blob = await shrinkPhoto(file);
  const response = await fetch('/api/admin/images', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Fotku sa nepodarilo nahrať (${response.status}).`);
  return result;
}

const photoInput = document.querySelector('#product-photo');
const photoPreview = document.querySelector('#product-photo-preview');
const removePhoto = document.querySelector('#remove-photo');

function showProductPhoto(url) {
  form.elements.image_url.value = url || '';
  photoPreview.hidden = !url;
  removePhoto.hidden = !url;
  if (url) photoPreview.src = url; else photoPreview.removeAttribute('src');
}

photoInput.addEventListener('change', async () => {
  const file = photoInput.files[0];
  if (!file) return;
  message('Zmenšujem a nahrávam fotku…');
  try {
    const result = await uploadPhoto(file);
    showProductPhoto(result.url);
    message('Fotka je nahraná. Nezabudni produkt uložiť.', 'success');
  } catch (error) {
    message(error.message, 'error');
  } finally {
    photoInput.value = '';
  }
});
removePhoto.addEventListener('click', () => showProductPhoto(''));

function resetForm() {
  form.reset();
  showProductPhoto('');
  form.elements.id.value = '';
  form.elements.status.value = 'draft';
  delete form.elements.slug.dataset.edited;
  document.querySelector('#form-heading').textContent = 'Nový produkt';
}

form.elements.name.addEventListener('input', () => {
  if (!form.elements.id.value || !form.elements.slug.dataset.edited) form.elements.slug.value = slugify(form.elements.name.value);
});
form.elements.slug.addEventListener('input', () => { form.elements.slug.dataset.edited = 'true'; });
document.querySelector('#reset-form').addEventListener('click', resetForm);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const product = formData();
  const url = product.id ? `/api/admin/products/${encodeURIComponent(product.id)}` : '/api/admin/products';
  const method = product.id ? 'PUT' : 'POST';
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  message(product.status === 'published' ? 'Ukladám a zverejňujem produkt…' : 'Ukladám koncept…');
  try {
    await request(url, { method, body: JSON.stringify(product) });
    message(product.status === 'published' ? 'Hotovo. Produkt je zverejnený v obchode.' : 'Hotovo. Produkt je bezpečne uložený ako koncept.', 'success');
    resetForm();
    await loadProducts();
  } catch (error) {
    message(error.message, 'error');
  } finally {
    submit.disabled = false;
  }
});

generateButton.addEventListener('click', async () => {
  const product = formData();
  if (!product.name || !product.notes) {
    message('Najprv doplň názov produktu a aspoň krátky opis/fakty.', 'error');
    form.elements.name.focus();
    return;
  }
  generateButton.disabled = true;
  generateButton.textContent = 'Grok pripravuje návrh…';
  message('Posielam stručné fakty Groku na vytvorenie návrhu.');
  try {
    const result = await request('/api/admin/generate-description', { method: 'POST', body: JSON.stringify(product) });
    form.elements.description.value = result.description;
    document.querySelector('#ai-model-note').textContent = `Použitý model: ${result.model}. Popis skontroluj pred uložením.`;
    message('Návrh je pripravený. Prečítaj si ho a uprav, čo treba.', 'success');
    form.elements.description.focus();
  } catch (error) {
    message(error.message, 'error');
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = '<span aria-hidden="true">✦</span> Navrhnúť popis s Grokom';
  }
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-edit]');
  if (!button) return;
  const product = products.find((item) => item.id === button.dataset.edit);
  if (!product) return;
  form.elements.id.value = product.id;
  for (const key of ['name', 'slug', 'category', 'material', 'dimensions', 'price_text', 'availability_text', 'image_url', 'description', 'status']) form.elements[key].value = product[key] || '';
  showProductPhoto(product.image_url || '');
  try { form.elements.variants.value = JSON.parse(product.variants_json || '[]').join('\n'); } catch { form.elements.variants.value = ''; }
  form.elements.notes.value = '';
  form.elements.slug.dataset.edited = 'true';
  document.querySelector('#form-heading').textContent = 'Upraviť produkt';
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.elements.name.focus({ preventScroll: true });
});

const inquiryList = document.querySelector('#inquiry-list');
const inquiryCount = document.querySelector('#inquiry-count');
let inquiries = [];

function inquiryStatusName(status) {
  return ({ new: 'Nový', handled: 'Vybavený', archived: 'Archív' })[status] || 'Nový';
}

function renderInquiries() {
  inquiryCount.textContent = String(inquiries.filter((item) => item.status === 'new').length);
  if (!inquiries.length) {
    inquiryList.innerHTML = '<p class="empty-list">Zatiaľ neprišiel žiadny dopyt.</p>';
    return;
  }
  inquiryList.innerHTML = inquiries.map((item) => {
    const contact = [`<a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a>`, item.phone && escapeHtml(item.phone), item.company && escapeHtml(item.company)].filter(Boolean).join(' · ');
    const meta = [item.quantity && `Počet: ${escapeHtml(item.quantity)}`, item.dimensions && `Rozmery: ${escapeHtml(item.dimensions)}`, item.deadline && `Termín: ${escapeHtml(item.deadline)}`].filter(Boolean).join(' · ');
    const actions = ['new', 'handled', 'archived'].filter((status) => status !== item.status)
      .map((status) => `<button class="edit-button" type="button" data-inquiry="${escapeHtml(item.id)}" data-status="${status}">${({ new: 'Označiť ako nový', handled: 'Vybavené', archived: 'Archivovať' })[status]}</button>`).join('');
    return `<article class="inquiry-row ${escapeHtml(item.status)}"><div class="inquiry-head"><div><h3>${escapeHtml(item.name)}</h3><p>${contact}</p></div><span class="status-pill ${escapeHtml(item.status)}">${inquiryStatusName(item.status)}</span></div><p class="inquiry-text">${escapeHtml(item.description)}</p>${meta ? `<p class="inquiry-meta">${meta}</p>` : ''}<div class="inquiry-head"><p>Prijaté ${escapeHtml(item.created_at)} UTC</p><div class="product-row-actions">${actions}</div></div></article>`;
  }).join('');
}

async function loadInquiries() {
  try {
    const result = await request('/api/admin/inquiries');
    inquiries = result.inquiries || [];
    renderInquiries();
  } catch (error) {
    inquiryList.innerHTML = `<p class="empty-list">${escapeHtml(error.message)}</p>`;
  }
}

inquiryList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-inquiry]');
  if (!button) return;
  button.disabled = true;
  try {
    await request(`/api/admin/inquiries/${encodeURIComponent(button.dataset.inquiry)}`, { method: 'PUT', body: JSON.stringify({ status: button.dataset.status }) });
    await loadInquiries();
  } catch (error) {
    message(error.message, 'error');
    button.disabled = false;
  }
});

const showcaseForm = document.querySelector('#showcase-form');
const showcaseList = document.querySelector('#showcase-list');
const showcaseCount = document.querySelector('#showcase-count');
let showcase = [];

function renderShowcase() {
  showcaseCount.textContent = String(showcase.filter((item) => item.status === 'published').length);
  if (!showcase.length) {
    showcaseList.innerHTML = '<p class="empty-list">Zatiaľ tu nie sú žiadne ukážky. Kým nejakú pridáš, sekcia sa na úvodnej stránke nezobrazí.</p>';
    return;
  }
  showcaseList.innerHTML = showcase.map((item) => `<article class="showcase-item ${escapeHtml(item.status)}"><img src="${escapeHtml(item.image_url)}" alt="" loading="lazy"><div><p>${escapeHtml(item.title) || '<i>Bez popisu</i>'}</p><span class="status-pill ${item.status === 'published' ? 'published' : 'archived'}">${item.status === 'published' ? 'Na webe' : 'Skrytá'}</span><div class="product-row-actions"><button class="edit-button" type="button" data-showcase="${escapeHtml(item.id)}" data-status="${item.status === 'published' ? 'hidden' : 'published'}">${item.status === 'published' ? 'Skryť' : 'Zobraziť'}</button><button class="edit-button" type="button" data-showcase-delete="${escapeHtml(item.id)}">Odstrániť</button></div></div></article>`).join('');
}

async function loadShowcase() {
  try {
    const result = await request('/api/admin/showcase');
    showcase = result.items || [];
    renderShowcase();
  } catch (error) {
    showcaseList.innerHTML = `<p class="empty-list">${escapeHtml(error.message)}</p>`;
  }
}

showcaseForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = showcaseForm.elements.photo.files[0];
  if (!file) return;
  const submit = showcaseForm.querySelector('[type="submit"]');
  submit.disabled = true;
  message('Zmenšujem a nahrávam ukážku…');
  try {
    const image = await uploadPhoto(file);
    await request('/api/admin/showcase', { method: 'POST', body: JSON.stringify({ image_id: image.id, title: showcaseForm.elements.title.value }) });
    showcaseForm.reset();
    message('Ukážka je pridaná na úvodnú stránku.', 'success');
    await loadShowcase();
  } catch (error) {
    message(error.message, 'error');
  } finally {
    submit.disabled = false;
  }
});

showcaseList.addEventListener('click', async (event) => {
  const toggle = event.target.closest('[data-showcase]');
  const remove = event.target.closest('[data-showcase-delete]');
  if (!toggle && !remove) return;
  if (remove && !window.confirm('Naozaj odstrániť túto ukážku aj s fotkou?')) return;
  try {
    if (toggle) await request(`/api/admin/showcase/${encodeURIComponent(toggle.dataset.showcase)}`, { method: 'PUT', body: JSON.stringify({ status: toggle.dataset.status }) });
    else await request(`/api/admin/showcase/${encodeURIComponent(remove.dataset.showcaseDelete)}`, { method: 'DELETE' });
    await loadShowcase();
  } catch (error) {
    message(error.message, 'error');
  }
});

loadProducts();
loadInquiries();
loadShowcase();
