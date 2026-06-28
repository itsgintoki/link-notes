const API = window.location.origin;
let accessToken = localStorage.getItem('accessToken') || '';
let currentNoteId = null;
let notes = [];
let currentPage = 1;
let hasMore = false;
let autoSaveTimeout = null;
let qrcodeInstance = null;

// ── Theme Management ──
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = savedTheme === 'dark' ? 'Light' : 'Dark';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = newTheme === 'dark' ? 'Light' : 'Dark';
  }
}

// ── Helpers ──
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

let _toastTimer = null;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Modals ──
function showModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

// ── Auth Tabs ──
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', (i === 0) === (tab === 'login'))
  );
  document.getElementById('login-form').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('auth-error').classList.remove('show');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
}

// ── Auth Actions ──
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showAuthError('Please fill in all fields.');

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showAuthError(data.message || 'Login failed');
    accessToken = data.accessToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    enterApp();
  } catch {
    showAuthError('Could not connect to server');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in →';
  }
}

async function handleRegister() {
  const firstName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!firstName || !email || !password) return showAuthError('Please fill in all fields.');
  if (password.length < 8) return showAuthError('Password must be at least 8 characters.');

  const btn = document.getElementById('reg-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, email, password })
    });
    const data = await res.json();
    if (!res.ok) return showAuthError(data.message || 'Registration failed');
    toast('Account created — sign in');
    switchTab('login');
    document.getElementById('login-email').value = email;
  } catch {
    showAuthError('Could not connect to server');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create account →';
  }
}

async function handleLogout() {
  const refreshToken = localStorage.getItem('refreshToken');
  try {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ refreshToken })
    });
  } catch {}
  accessToken = '';
  localStorage.clear();
  location.reload();
}

// ── API Fetch with Auto-Refresh ──
async function apiFetch(path, options = {}) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    ...(options.headers || {})
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(`${API}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(`${API}${path}`, { ...options, headers });
    } else {
      toast('Session expired — please login', 'error');
      localStorage.clear();
      location.reload();
      return null;
    }
  }

  return res.json();
}

async function tryRefreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.accessToken;
    localStorage.setItem('accessToken', accessToken);
    return true;
  } catch {
    return false;
  }
}

// ── App Entry ──
async function enterApp() {
  document.getElementById('auth-screen').style.display = 'none';
  const app = document.getElementById('app-screen');
  app.style.display = 'flex';
  app.classList.add('active');

  const me = await apiFetch('/auth/me');
  if (me?.user) {
    document.getElementById('topbar-user').textContent = me.user.email;
  }
  initTheme();
  loadNotes();
}

// ── Notes ──
async function loadNotes(search = '', page = 1) {
  let url = `/notes?page=${page}&limit=20`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  const data = await apiFetch(url);
  if (!data) return;

  notes = data.notes || [];
  currentPage = data.page || 1;
  hasMore = notes.length >= (data.limit || 20);
  renderNotesList();
  renderPagination();
}

function renderNotesList() {
  const list = document.getElementById('notes-list');
  if (notes.length === 0) {
    list.innerHTML = '<div style="padding:24px;font-family:var(--mono);font-size:10px;color:#444;text-align:center;letter-spacing:0.1em;">NO NOTES YET</div>';
    return;
  }
  list.innerHTML = notes.map(n => {
    const active = n.id === currentNoteId ? 'active' : '';
    const date = new Date(n.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    const pinMarkup = n.is_pinned ? '<span class="pin-icon" title="Pinned">📌</span>' : '';
    return `<div class="note-item ${active}" onclick="openNote('${esc(n.id)}')">
      <div class="note-item-title"><span>${esc(n.title)}</span>${pinMarkup}</div>
      <div class="note-item-meta">
        <div class="note-item-date">${date}</div>
        <div class="note-item-clicks">↗ ${n.clicks}</div>
      </div>
    </div>`;
  }).join('');
}

function renderPagination() {
  const footer = document.getElementById('sidebar-footer');
  if (!footer) return;
  const info = footer.querySelector('.page-info');
  const btns = footer.querySelector('.page-btns');
  info.textContent = `PAGE ${currentPage}`;
  btns.innerHTML = `
    <button class="page-btn" onclick="loadNotes(document.getElementById('search-input').value, ${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>←</button>
    <button class="page-btn" onclick="loadNotes(document.getElementById('search-input').value, ${currentPage + 1})" ${!hasMore ? 'disabled' : ''}>→</button>
  `;
}

async function openNote(id) {
  currentNoteId = id;
  const data = await apiFetch(`/notes/${id}`);
  if (!data?.note) return;
  const n = data.note;

  document.getElementById('empty-state').style.display = 'none';
  const editor = document.getElementById('note-editor');
  editor.style.display = 'flex';

  document.getElementById('note-title').value = n.title;
  document.getElementById('note-body').value = n.body;
  document.getElementById('share-code').textContent = `/n/${n.short_code}`;
  document.getElementById('note-meta').textContent = `CLICKS: ${n.clicks}  ·  ${new Date(n.created_at).toLocaleDateString().toUpperCase()}`;
  document.getElementById('attachments-section').style.display = '';
  
  // Update pin button state
  const pinBtn = document.getElementById('pin-btn');
  if (n.is_pinned) {
    pinBtn.classList.add('pinned');
    pinBtn.textContent = 'Pinned';
  } else {
    pinBtn.classList.remove('pinned');
    pinBtn.textContent = 'Pin';
  }

  // Update Status and metrics
  updateWordCount(n.body);
  updateSaveStatus('saved');

  renderAttachments(n.attachments || []);
  renderNotesList();
}

function renderAttachments(attachments) {
  const grid = document.getElementById('attachments-grid');
  if (attachments.length === 0) {
    grid.innerHTML = '<div style="font-family:var(--mono);font-size:9px;color:#bbb;padding:4px 0;letter-spacing:0.05em;">NO FILES ATTACHED</div>';
    return;
  }
  grid.innerHTML = attachments.map(a => `
    <div class="attachment-item">
      <a href="${esc(a.cloudinaryUrl)}" target="_blank" rel="noopener">${esc(a.originalName)}</a>
      <span class="attachment-size">${(a.size / 1024).toFixed(0)}KB</span>
      <button class="attachment-delete" onclick="deleteAttachment('${esc(a.id)}')" title="Delete">×</button>
    </div>
  `).join('');
}

async function handleUpload(input) {
  if (!currentNoteId) return toast('Save the note first', 'error');
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  toast('Uploading...');

  try {
    const res = await fetch(`${API}/notes/${currentNoteId}/attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) return toast(data.message || 'Upload failed', 'error');
    toast('File uploaded');
    input.value = '';
    openNote(currentNoteId);
  } catch {
    toast('Upload failed', 'error');
  }
}

async function deleteAttachment(attachmentId) {
  try {
    const res = await fetch(`${API}/notes/${currentNoteId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();
    if (data.success) {
      toast('Attachment deleted');
      openNote(currentNoteId);
    }
  } catch {
    toast('Failed to delete', 'error');
  }
}

function newNote() {
  currentNoteId = null;
  document.getElementById('empty-state').style.display = 'none';
  const editor = document.getElementById('note-editor');
  editor.style.display = 'flex';
  document.getElementById('note-title').value = '';
  document.getElementById('note-body').value = '';
  document.getElementById('share-code').textContent = '/n/new';
  document.getElementById('note-meta').textContent = 'UNSAVED';
  document.getElementById('attachments-section').style.display = 'none';
  
  const pinBtn = document.getElementById('pin-btn');
  pinBtn.classList.remove('pinned');
  pinBtn.textContent = 'Pin';

  updateWordCount('');
  updateSaveStatus('unsaved');
  document.getElementById('note-title').focus();
}

async function saveNote() {
  const title = document.getElementById('note-title').value.trim();
  const body = document.getElementById('note-body').value.trim();
  if (!title || !body) return toast('Title and body required', 'error');

  updateSaveStatus('saving');

  if (currentNoteId) {
    const data = await apiFetch(`/notes/${currentNoteId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, body })
    });
    if (data?.success) {
      updateSaveStatus('saved');
      loadNotes(document.getElementById('search-input').value, currentPage);
    } else {
      updateSaveStatus('unsaved');
    }
  } else {
    const data = await apiFetch('/notes', {
      method: 'POST',
      body: JSON.stringify({ title, body })
    });
    if (data?.success) {
      currentNoteId = data.note.id;
      updateSaveStatus('saved');
      loadNotes();
      openNote(currentNoteId);
    } else {
      updateSaveStatus('unsaved');
    }
  }
}

function confirmDelete() {
  showModal('delete-modal');
}

async function deleteNote() {
  if (!currentNoteId) return closeModal('delete-modal');
  const data = await apiFetch(`/notes/${currentNoteId}`, { method: 'DELETE' });
  if (data?.success) {
    toast('Note deleted');
    currentNoteId = null;
    closeModal('delete-modal');
    document.getElementById('note-editor').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
    loadNotes();
  }
}

function copyShortLink() {
  const code = document.getElementById('share-code').textContent;
  if (code === '/n/new') return toast('Save the note first', 'error');
  navigator.clipboard.writeText(`${API}${code}`);
  toast('Short link copied');
}

let _searchTimer;
function handleSearch(val) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => loadNotes(val, 1), 300);
}

// ── Auto Save & Metrics ──
function triggerAutoSave() {
  updateSaveStatus('unsaved');
  clearTimeout(autoSaveTimeout);
  if (currentNoteId) {
    autoSaveTimeout = setTimeout(() => {
      saveNote();
    }, 1500);
  }
}

function onBodyInput() {
  const bodyVal = document.getElementById('note-body').value;
  updateWordCount(bodyVal);
  triggerAutoSave();
}

function updateWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minutes = Math.ceil(words / 200);
  document.getElementById('note-word-count').textContent = `${words} words · ${minutes} min read`;
}

function updateSaveStatus(status) {
  const el = document.getElementById('save-status');
  if (!el) return;
  if (status === 'saved') {
    el.className = 'note-status saved';
    el.textContent = 'Saved';
  } else if (status === 'saving') {
    el.className = 'note-status saving';
    el.textContent = 'Saving...';
  } else {
    el.className = 'note-status';
    el.textContent = 'Unsaved';
  }
}

// ── Pin Note ──
async function togglePinNote() {
  if (!currentNoteId) return toast('Save the note first', 'error');
  const data = await apiFetch(`/notes/${currentNoteId}/pin`, {
    method: 'PATCH'
  });
  if (data?.success) {
    const pinBtn = document.getElementById('pin-btn');
    if (data.note.is_pinned) {
      pinBtn.classList.add('pinned');
      pinBtn.textContent = 'Pinned';
      toast('Note pinned');
    } else {
      pinBtn.classList.remove('pinned');
      pinBtn.textContent = 'Pin';
      toast('Note unpinned');
    }
    loadNotes(document.getElementById('search-input').value, currentPage);
  }
}

// ── Duplicate Note ──
async function duplicateNote() {
  if (!currentNoteId) return toast('No note to duplicate', 'error');
  const title = document.getElementById('note-title').value.trim() + " (Copy)";
  const body = document.getElementById('note-body').value.trim();
  
  toast('Duplicating...');
  const data = await apiFetch('/notes', {
    method: 'POST',
    body: JSON.stringify({ title, body })
  });
  if (data?.success) {
    currentNoteId = data.note.id;
    toast('Note duplicated');
    loadNotes();
    openNote(currentNoteId);
  } else {
    toast('Failed to duplicate', 'error');
  }
}

// ── Export Markdown ──
function exportMarkdown() {
  const title = document.getElementById('note-title').value.trim() || 'untitled';
  const body = document.getElementById('note-body').value;
  
  const content = `# ${title}\n\n${body}`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast('Markdown exported');
}

// ── QR Code ──
function showQrModal() {
  const code = document.getElementById('share-code').textContent;
  if (code === '/n/new') return toast('Save the note first', 'error');
  
  const fullUrl = `${API}${code}`;
  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';
  
  qrcodeInstance = new QRCode(qrContainer, {
    text: fullUrl,
    width: 160,
    height: 160,
    colorDark : "#0f0f0f",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });
  
  showModal('qr-modal');
}

// ── Keyboard Shortcuts Modal ──
function showShortcuts() {
  showModal('shortcuts-modal');
}

// ── Keyboard Shortcuts listener ──
document.addEventListener('keydown', (e) => {
  // Check if user is on app screen
  if (document.getElementById('app-screen').style.display === 'none') return;
  
  const isCtrl = e.ctrlKey || e.metaKey;
  
  if (isCtrl && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (document.getElementById('note-editor').style.display !== 'none') {
      saveNote();
    }
  } else if (isCtrl && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    newNote();
  } else if (isCtrl && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    if (currentNoteId) togglePinNote();
  } else if (isCtrl && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    if (currentNoteId) duplicateNote();
  } else if (isCtrl && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (currentNoteId) copyShortLink();
  }
});

// ── Init ──
if (accessToken) enterApp();
else initTheme();
