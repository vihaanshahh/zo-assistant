const promptEl = document.getElementById('prompt');
const statusEl = document.getElementById('status');
const sendBtn = document.getElementById('send-btn');
const sendIcon = document.getElementById('send-icon');
const loadingIcon = document.getElementById('loading-icon');
const clearBtn = document.getElementById('clear-btn');
const closeBtn = document.getElementById('close-btn');
const themeBtn = document.getElementById('theme-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const tokenInput = document.getElementById('token-input');
const saveTokenBtn = document.getElementById('save-token-btn');
const stealthToggle = document.getElementById('stealth-toggle');

let isLoading = false;
let isMiniMode = false;

// ── Theme ──────────────────────────────────────────────────────────────────

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  const sunIcon = themeBtn.querySelector('.sun-icon');
  const moonIcon = themeBtn.querySelector('.moon-icon');
  if (sunIcon) sunIcon.style.display = dark ? '' : 'none';
  if (moonIcon) moonIcon.style.display = dark ? 'none' : '';
}

// Default dark; override if user previously chose light
const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme !== 'light');

themeBtn.addEventListener('click', () => {
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
  // Reload available models with new token
  loadModels().catch(() => {});
});

// Load existing token hint on start
window.stealth.getSettings().then(settings => {
  if (settings && settings.zoToken) {
    tokenInput.placeholder = '••••••••••••••••• (token saved)';
  }
}).catch(() => {});

// Load stealth mode setting
window.stealth.getStealthMode().then(enabled => {
  stealthToggle.checked = enabled;
}).catch(() => {});

// Handle stealth mode toggle
stealthToggle.addEventListener('change', async () => {
  await window.stealth.setStealthMode(stealthToggle.checked);
});

// Load available models
let availableModels = [];

async function loadModels() {
  const { ok, models } = await window.stealth.getModels();
  if (ok && models.length > 0) {
    availableModels = models;
    const saved = await window.stealth.getModel();
    renderModelDropdown(saved);
  }
}

function renderModelDropdown(selectedValue) {
  const container = document.getElementById('model-dropdown');
  const selected = availableModels.find(m => m.model_name === selectedValue);
  const label = selected ? selected.label : 'Default';

  container.innerHTML = `
    <div class="dropdown-selected" tabindex="0">
      <span>${label}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  `;

  const toggle = container.querySelector('.dropdown-selected');
  let menu = null;

  function openMenu() {
    if (menu) return;

    menu = document.createElement('div');
    menu.className = 'dropdown-menu-fixed';
    menu.innerHTML = `
      <div class="dropdown-item${!selectedValue ? ' active' : ''}" data-value="">Default</div>
      ${availableModels.map(m => `
        <div class="dropdown-item${m.model_name === selectedValue ? ' active' : ''}" data-value="${m.model_name}">
          <span class="model-label">${m.label}</span>
          <span class="model-vendor">${m.vendor || ''}</span>
        </div>
      `).join('')}
    `;

    document.body.appendChild(menu);

    // Position above the toggle
    const rect = toggle.getBoundingClientRect();
    menu.style.left = rect.left + 'px';
    menu.style.width = rect.width + 'px';
    menu.style.bottom = (window.innerHeight - rect.top + 4) + 'px';

    container.classList.add('open');

    menu.addEventListener('click', async (e) => {
      const item = e.target.closest('.dropdown-item');
      if (item) {
        const value = item.dataset.value;
        await window.stealth.setModel(value);
        closeMenu();
        renderModelDropdown(value);
      }
    });
  }

  function closeMenu() {
    if (menu) {
      menu.remove();
      menu = null;
    }
    container.classList.remove('open');
  }

  toggle.addEventListener('click', () => {
    if (menu) closeMenu();
    else openMenu();
  });

  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (menu) closeMenu();
      else openMenu();
    }
    if (e.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (menu && !container.contains(e.target) && !menu.contains(e.target)) {
      closeMenu();
    }
  });
}

loadModels().catch(() => {});

// ── Streaming ──────────────────────────────────────────────────────────────

let streamBuffer = '';

window.stealth.onZoChunk((chunk) => {
  streamBuffer += chunk;
  statusEl.className = '';
  statusEl.innerHTML = renderMarkdown(streamBuffer);
  statusEl.scrollTop = statusEl.scrollHeight;
  if (isMiniMode) {
    adjustMiniHeight();
  } else {
    adjustHeight();
  }
});

window.stealth.onZoStatus((status) => {
  if (isLoading) {
    statusEl.className = 'processing';
    statusEl.textContent = status;
    adjustHeight();
  }
});

// ── Submit ─────────────────────────────────────────────────────────────────

async function submit() {
  if (isLoading) return;
  const input = promptEl.value.trim();
  if (!input) return;

  isLoading = true;
  streamBuffer = '';
  setLoading(true);
  promptEl.value = '';
  promptEl.style.height = '';
  sendBtn.classList.remove('has-content');

  // Show a minimal loading indicator
  statusEl.className = 'processing';
  statusEl.textContent = 'Thinking…';
  adjustHeight();

  try {
    const res = await window.stealth.zoAsk(input);
    if (!res.ok) {
      showError(res.error || 'Something went wrong.');
    }
    // Streaming chunks already populated statusEl via onZoChunk.
    // If no chunks came through (non-streaming fallback), render output.
    if (res.ok && streamBuffer === '') {
      showStatus(res.output, false);
    }
    // Final height adjustment for mini mode
    if (isMiniMode) {
      setTimeout(adjustMiniHeight, 50);
    }
  } catch (e) {
    showError(String(e));
  } finally {
    isLoading = false;
    setLoading(false);
    if (!isMiniMode) promptEl.focus();
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
  if (isMiniMode) {
    adjustMiniHeight();
  } else {
    adjustHeight();
  }
}

function showError(msg) {
  statusEl.className = 'error';
  statusEl.textContent = msg;
  adjustHeight();
}

// ── Event listeners ────────────────────────────────────────────────────────

sendBtn.addEventListener('click', submit);

promptEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
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
  streamBuffer = '';
  sendBtn.classList.remove('has-content');
  window.stealth.newConversation(); // reset conversation memory in main process
  adjustHeight();
});

closeBtn.addEventListener('click', () => {
  window.stealth.toggleOverlay();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.stealth.toggleOverlay();
});

// Open external links in default browser
statusEl.addEventListener('click', (e) => {
  // In mini mode, clicking expands back to full
  if (isMiniMode) {
    setMiniMode(false);
    return;
  }
  const link = e.target.closest('a[data-external="true"]');
  if (link) {
    e.preventDefault();
    const url = link.getAttribute('href');
    if (url) window.stealth.openExternal(url);
  }
});

// ── Mini mode ───────────────────────────────────────────────────────────────

function setMiniMode(mini) {
  isMiniMode = mini;
  document.documentElement.classList.toggle('mini-mode', mini);

  if (mini) {
    // Shrink to banner size and snap to bottom-right
    setTimeout(() => {
      const contentHeight = Math.min(180, Math.max(48, statusEl.scrollHeight + 20));
      window.stealth.resizeOverlay({ width: 340, height: contentHeight, mini: true });
    }, 10);
  } else {
    // Restore full size and recenter
    window.stealth.resizeOverlay({ width: 760, height: 280, recenter: true });
    setTimeout(() => {
      adjustHeight();
      promptEl.focus();
    }, 50);
  }
}

function adjustMiniHeight() {
  if (!isMiniMode) return;
  const contentHeight = Math.min(180, Math.max(48, statusEl.scrollHeight + 20));
  window.stealth.resizeOverlay({ width: 340, height: contentHeight, mini: true });
}

window.stealth.onMiniMode(() => setMiniMode(true));
window.stealth.onFullMode(() => setMiniMode(false));

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
  // First, collect footnote definitions [^1]: url
  const footnotes = {};
  text = text.replace(/^\[\^(\w+)\]:\s*(.+)$/gm, (_, id, url) => {
    footnotes[id] = url.trim();
    return ''; // Remove the definition line
  });

  let html = escapeHtml(text);

  // Fenced code blocks
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (but not within URLs or already processed)
  html = html.replace(/(?<![\/:])\*([^*]+)\*(?![\/])/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
    const decodedUrl = url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    return `<a href="${decodedUrl}" data-external="true">${linkText}</a>`;
  });

  // Footnote references [^1] - convert to links using collected definitions
  html = html.replace(/\[\^(\w+)\]/g, (_, id) => {
    const url = footnotes[id];
    if (url) {
      const decodedUrl = url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      return `<a href="${decodedUrl}" data-external="true" class="footnote-link"></a>`;
    }
    return '';
  });

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

  // Clean up extra whitespace
  html = html.replace(/\n{3,}/g, '\n\n');

  // Paragraphs
  const parts = html.split(/\n\n+/);
  html = parts.map(p => {
    p = p.trim();
    if (!p) return '';
    if (/^<(h[1-6]|ul|ol|pre|hr|li)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).filter(p => p).join('');

  return html;
}
