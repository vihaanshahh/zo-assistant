const promptEl = document.getElementById('prompt');
const statusEl = document.getElementById('status');
const sendBtn = document.getElementById('send-btn');
const sendIcon = document.getElementById('send-icon');
const loadingIcon = document.getElementById('loading-icon');
const clearBtn = document.getElementById('clear-btn');
const closeBtn = document.getElementById('close-btn');
const themeToggle = document.getElementById('theme-toggle');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const tokenInput = document.getElementById('token-input');
const saveTokenBtn = document.getElementById('save-token-btn');

let isLoading = false;

// ── Theme ──────────────────────────────────────────────────────────────────

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme === 'dark');

themeToggle.addEventListener('click', () => {
  applyTheme(!document.documentElement.classList.contains('dark'));
});

// ── Settings ───────────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('open');
  if (settingsPanel.classList.contains('open')) {
    tokenInput.focus();
  }
});

saveTokenBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) return;
  await window.stealth.setSettings({ zoToken: token });
  tokenInput.value = '';
  settingsPanel.classList.remove('open');
  showStatus('Token saved.', false);
});

// Load existing token hint on start
window.stealth.getSettings().then(settings => {
  if (settings && settings.zoToken) {
    tokenInput.placeholder = '••••••••••••••••• (token saved)';
  }
}).catch(() => {});

// ── Submit ─────────────────────────────────────────────────────────────────

async function submit() {
  if (isLoading) return;
  const input = promptEl.value.trim();
  if (!input) return;

  isLoading = true;
  setLoading(true);
  promptEl.value = '';
  promptEl.style.height = '';
  sendBtn.classList.remove('has-content');

  showStatus('Asking Zo\u2026', true);

  try {
    const res = await window.stealth.zoAsk(input);
    if (res.ok) {
      showStatus(res.output, false);
    } else {
      showError(res.error || 'Something went wrong.');
    }
  } catch (e) {
    showError(String(e));
  } finally {
    isLoading = false;
    setLoading(false);
    promptEl.focus();
  }
}

function setLoading(loading) {
  sendBtn.classList.toggle('loading', loading);
  sendIcon.style.display = loading ? 'none' : '';
  loadingIcon.style.display = loading ? '' : 'none';
}

function showStatus(text, isProcessing) {
  statusEl.className = isProcessing ? 'processing' : '';
  statusEl.innerHTML = isProcessing
    ? `<span class="loading-text">${escapeHtml(text)}</span>`
    : renderMarkdown(text);
  statusEl.scrollTop = statusEl.scrollHeight;
  adjustHeight();
}

function showError(msg) {
  statusEl.className = 'error';
  statusEl.textContent = msg;
  adjustHeight();
}

// ── Event listeners ────────────────────────────────────────────────────────

sendBtn.addEventListener('click', submit);

promptEl.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    submit();
  }
});

window.stealth.onHotkeySubmit(() => submit());

promptEl.addEventListener('input', () => {
  promptEl.style.height = 'auto';
  promptEl.style.height = Math.min(promptEl.scrollHeight, 180) + 'px';
  sendBtn.classList.toggle('has-content', promptEl.value.trim().length > 0);
});

clearBtn.addEventListener('click', () => {
  statusEl.className = '';
  statusEl.innerHTML = '';
  promptEl.value = '';
  promptEl.style.height = '';
  sendBtn.classList.remove('has-content');
  adjustHeight();
});

closeBtn.addEventListener('click', () => {
  window.stealth.toggleOverlay();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.stealth.toggleOverlay();
});

// ── Height adjustment ──────────────────────────────────────────────────────

function adjustHeight() {
  const wrap = document.getElementById('wrap');
  const margin = 32;
  const newHeight = wrap.scrollHeight + margin;
  window.stealth.resizeOverlay({ height: Math.max(280, Math.min(newHeight, 800)) });
}

// ── Markdown renderer ──────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Fenced code blocks
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Unordered list items
  html = html.replace(/^[ \t]*[-*] (.+)$/gm, '<li>$1</li>');

  // Ordered list items
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\s*<li>[\s\S]*?<\/li>)*/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Paragraphs
  const parts = html.split(/\n\n+/);
  html = parts.map(p => {
    p = p.trim();
    if (!p) return '';
    if (/^<(h[1-6]|ul|ol|pre|hr|li)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}
