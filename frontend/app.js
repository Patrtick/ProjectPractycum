/* ============================================
   AnonymizServis — app.js
   (merged: script.js + generation.js + anonymization.js)
   ============================================ */

const API_BASE = 'http://localhost:8000';

/* ============================================
   script.js — shared utilities
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── FAQ button ────────────────────────────────
  const faqBtn = document.querySelector('.faq-btn');
  if (faqBtn) {
    faqBtn.addEventListener('click', () => {
      showNotification('Раздел FAQ в разработке');
    });
  }

  // ── Settings modal ─────────────────────────────
  const SETTINGS_DEFAULTS = {
    theme: 'dark',
    animations: true,
    defaultRows: '',
    confirmDownload: false,
  };

  function loadSettings() {
    try {
      return Object.assign({}, SETTINGS_DEFAULTS, JSON.parse(localStorage.getItem('anonymiz_settings') || '{}'));
    } catch { return Object.assign({}, SETTINGS_DEFAULTS); }
  }

  function saveSettings(s) {
    try { localStorage.setItem('anonymiz_settings', JSON.stringify(s)); } catch {}
  }

  function applySettings(s) {
    // Theme
    if (s.theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }


    // Animations
    if (!s.animations) {
      document.body.classList.add('no-animations');
    } else {
      document.body.classList.remove('no-animations');
    }

    // Expose for other features
    window._settings = s;
  }

  // Apply on load
  applySettings(loadSettings());

  function openSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (!overlay) return;
    const s = loadSettings();
    const el = id => document.getElementById(id);
    // Theme buttons
    document.querySelectorAll('.settings-theme-btn').forEach(btn => {
      btn.classList.toggle('settings-theme-btn--active', btn.dataset.theme === s.theme);
    });
    if (el('setting-animations'))       el('setting-animations').checked = s.animations;
    if (el('setting-default-rows'))     el('setting-default-rows').value = s.defaultRows || '';
    if (el('setting-confirm-download')) el('setting-confirm-download').checked = s.confirmDownload;

    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('settings-overlay--visible'));
  }

  function closeSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.remove('settings-overlay--visible');
      setTimeout(() => { overlay.style.display = 'none'; }, 280);
    }
  }

  // Читаем текущие значения из UI
  function readUISettings() {
    const activeThemeBtn = document.querySelector('.settings-theme-btn--active');
    const el = id => document.getElementById(id);
    return {
      theme:           activeThemeBtn?.dataset.theme || 'dark',
      animations:      el('setting-animations')?.checked ?? true,
      defaultRows:     el('setting-default-rows')?.value || '',
      confirmDownload: el('setting-confirm-download')?.checked ?? false,
    };
  }

  // Тема — живое применение
  document.getElementById('settings-theme-switch')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.settings-theme-btn');
    if (!btn) return;
    document.querySelectorAll('.settings-theme-btn').forEach(b =>
      b.classList.toggle('settings-theme-btn--active', b === btn)
    );
    applySettings(readUISettings());
  });

  // Анимации — живое применение
  document.getElementById('setting-animations')?.addEventListener('change', () => {
    applySettings(readUISettings());
  });

  // Подтверждение скачивания — живое применение
  document.getElementById('setting-confirm-download')?.addEventListener('change', () => {
    applySettings(readUISettings());
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.textContent.trim() === 'Настройки') {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        openSettings();
      });
    }
  });

  // Закрыть без сохранения — откатываем к последнему сохранённому
  function closeCancelSettings() {
    applySettings(loadSettings());
    closeSettings();
  }

  document.getElementById('settings-close')?.addEventListener('click', closeCancelSettings);
  document.getElementById('settings-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCancelSettings();
  });

  document.getElementById('settings-save')?.addEventListener('click', () => {
    const s = readUISettings();
    saveSettings(s);
    applySettings(s);
    showNotification('Настройки сохранены');
    closeSettings();
  });

  // ── Nav hand icon ─────────────────────────────
  const navHand = document.querySelector('.nav-hand');
  if (navHand) {
    navHand.addEventListener('click', () => {
      showNotification('Нужна помощь? Напишите нам на anon@gmail.com');
    });
  }

  // ── Smooth scroll for nav links ───────────────
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });


  /* ============================================
     generation.js — page: generation.html
     ============================================ */

  if (document.getElementById('gen-step-1')) {

    // ── State ──────────────────────────────────────
    let currentStep = 1;
    let selectedTemplate = 'users';
    let generatedData = null;

    const TEMPLATE_COLUMNS = {
      users:  ['full_name', 'email', 'phone', 'city', 'registration_date'],
      orders: ['order_id', 'user_id', 'date', 'amount', 'status'],
    };

    const COLUMN_LABELS = {
      full_name:         'ФИО',
      email:             'Email',
      phone:             'Телефон',
      city:              'Город',
      registration_date: 'Дата регистрации',
      order_id:          'ID заказа',
      user_id:           'ID пользователя',
      date:              'Дата',
      amount:            'Сумма',
      status:            'Статус',
    };

    const genSteps = [
      document.getElementById('gen-step-1'),
      document.getElementById('gen-step-2'),
      document.getElementById('gen-step-3'),
    ];

    const genPageEl      = document.getElementById('page-generation');
    const genStepCircles = genPageEl.querySelectorAll('.gen-step');
    const genStepLines   = genPageEl.querySelectorAll('.gen-step-line');

    // ── Click on step circles to navigate ─────────
    genStepCircles.forEach((el, i) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const target = i + 1;
        if (target < currentStep) {
          goToGenStep(target);
        } else if (target === currentStep + 1) {
          if (target === 2) {
            renderToggles();
            goToGenStep(2);
          } else if (target === 3) {
            const selectedCols = getSelectedColumns();
            if (selectedCols.length === 0) {
              showNotification('Выберите хотя бы один столбец для генерации');
              return;
            }
            const rowsVal = document.getElementById('gen-rows-input')?.value;
            const rows = parseInt(rowsVal, 10);
            if (!rowsVal || isNaN(rows) || rows < 1 || rows > 10000) {
              showNotification('Введите количество строк от 1 до 10 000');
              return;
            }
            goToGenStep(3);
            runGeneration();
          }
        }
      });
    });

    // ── Reset generation state ─────────────────────
    function resetGenState() {
      generatedData = null;
      selectedTemplate = 'users';
      document.querySelectorAll('.gen-template').forEach(c => c.classList.remove('gen-template--selected'));
      const firstTemplate = genPageEl.querySelector('.gen-template[data-template="users"]');
      if (firstTemplate) firstTemplate.classList.add('gen-template--selected');
      const rowsInput = document.getElementById('gen-rows-input');
      if (rowsInput) rowsInput.value = '';
      const dlBtn = document.getElementById('btn-download');
      if (dlBtn) dlBtn.disabled = true;
      goToGenStep(1);
    }
    window._resetGenState = resetGenState;

    // ── Template selection ─────────────────────────
    document.querySelectorAll('.gen-template').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.gen-template').forEach(c => c.classList.remove('gen-template--selected'));
        card.classList.add('gen-template--selected');
        selectedTemplate = card.dataset.template;
        renderToggles();
      });
    });

    // ── Navigation buttons ─────────────────────────
    document.getElementById('btn-next-1')?.addEventListener('click', () => {
      renderToggles();
      // Apply default rows from settings
      const rowsInput = document.getElementById('gen-rows-input');
      if (rowsInput && !rowsInput.value && window._settings?.defaultRows) {
        rowsInput.value = window._settings.defaultRows;
      }
      goToGenStep(2);
    });

    document.getElementById('btn-next-2')?.addEventListener('click', () => {
      const selectedCols = getSelectedColumns();
      if (selectedCols.length === 0) {
        showNotification('Выберите хотя бы один столбец для генерации');
        return;
      }
      const rowsVal = document.getElementById('gen-rows-input')?.value;
      const rows = parseInt(rowsVal, 10);
      if (!rowsVal || isNaN(rows) || rows < 1 || rows > 10000) {
        showNotification('Введите количество строк от 1 до 10 000');
        return;
      }
      goToGenStep(3);
      runGeneration();
    });

    document.getElementById('btn-back-2')?.addEventListener('click', () => goToGenStep(1));
    document.getElementById('btn-back-3')?.addEventListener('click', () => goToGenStep(2));
    document.getElementById('btn-download')?.addEventListener('click', downloadGenResult);

    // ── Mode switcher ──────────────────────────────
    document.getElementById('btn-generate')?.addEventListener('click', () => setGenMode('generate'));
    document.getElementById('btn-anonymize')?.addEventListener('click', () => {
      showPage('anonymization');
    });

    function setGenMode(mode) {
      const btnG = document.getElementById('btn-generate');
      const btnA = document.getElementById('btn-anonymize');
      if (mode === 'generate') {
        btnG.classList.add('gen-mode-btn--active');
        btnG.classList.remove('gen-mode-btn--inactive');
        btnA.classList.remove('gen-mode-btn--active');
        btnA.classList.add('gen-mode-btn--inactive');
      } else {
        btnA.classList.add('gen-mode-btn--active');
        btnA.classList.remove('gen-mode-btn--inactive');
        btnG.classList.remove('gen-mode-btn--active');
        btnG.classList.add('gen-mode-btn--inactive');
      }
    }

    // ── Render column toggles ──────────────────────
    function updateNextBtnState() {
      const btn = document.getElementById('btn-next-2');
      if (!btn) return;
      const anyChecked = document.querySelectorAll('.gen-toggle-cb:checked').length > 0;
      btn.disabled = !anyChecked;
      btn.title = anyChecked ? '' : 'Выберите хотя бы один столбец';
    }

    function renderToggles() {
      const container = document.getElementById('gen-toggles-grid');
      if (!container) return;
      const cols = TEMPLATE_COLUMNS[selectedTemplate] || [];
      container.innerHTML = '';
      cols.forEach(col => {
        const label = COLUMN_LABELS[col] || col;
        const item = document.createElement('div');
        item.className = 'gen-toggle-item';
        item.innerHTML = `
          <span class="gen-toggle-label">${label}</span>
          <label class="gen-toggle-switch">
            <input type="checkbox" class="gen-toggle-cb" data-col="${col}" checked />
            <span class="gen-toggle-track">
              <span class="gen-toggle-thumb"></span>
            </span>
          </label>
        `;
        container.appendChild(item);
      });
      // Re-attach change listener (remove old one by replacing innerHTML, so fresh add)
      container.addEventListener('change', updateNextBtnState);
      updateNextBtnState();
    }

    function getSelectedColumns() {
      return [...document.querySelectorAll('.gen-toggle-cb:checked')].map(cb => cb.dataset.col);
    }

    // ── Step transition ────────────────────────────
    function goToGenStep(n) {
      const current = genSteps[currentStep - 1];
      const next    = genSteps[n - 1];
      const forward = n > currentStep;

      if (current && current !== next) {
        current.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        current.style.opacity    = '0';
        current.style.transform  = forward ? 'translateY(-18px) scale(0.98)' : 'translateY(18px) scale(0.98)';
        setTimeout(() => {
          current.classList.add('gen-content--hidden');
          current.style.transition = '';
          current.style.opacity    = '';
          current.style.transform  = '';

          next.classList.remove('gen-content--hidden');
          next.style.opacity   = '0';
          next.style.transform = forward ? 'translateY(24px) scale(0.98)' : 'translateY(-24px) scale(0.98)';
          requestAnimationFrame(() => {
            next.style.transition = 'opacity 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.35s cubic-bezier(0.4,0,0.2,1)';
            next.style.opacity    = '1';
            next.style.transform  = 'translateY(0) scale(1)';
            setTimeout(() => {
              next.style.transition = '';
              next.style.opacity    = '';
              next.style.transform  = '';
            }, 360);
          });
        }, 200);
      } else if (next) {
        next.classList.remove('gen-content--hidden');
      }

      currentStep = n;
      updateGenStepUI();
    }

    function updateGenStepUI() {
      genStepCircles.forEach((el, i) => {
        el.classList.remove('gen-step--active', 'gen-step--done');
        if (i + 1 === currentStep) el.classList.add('gen-step--active');
        else if (i + 1 < currentStep) el.classList.add('gen-step--done');
      });
      genStepLines.forEach((line, i) => {
        if (i + 1 < currentStep) {
          line.classList.add('done');
          line.style.background = 'rgba(174, 255, 244, 0.6)';
        } else {
          line.classList.remove('done');
          line.style.background = '';
        }
      });
    }

    // ── Generation ────────────────────────────────
    async function runGeneration() {
      const rows    = parseInt(document.getElementById('gen-rows-input')?.value, 10) || 100;
      const columns = getSelectedColumns();
      const dlBtn   = document.getElementById('btn-download');
      const preview = document.getElementById('gen-preview-table-wrap');
      const statusEl = document.getElementById('gen-step3-status');

      if (dlBtn) dlBtn.disabled = true;
      if (preview) preview.innerHTML = '<p class="gen-progress-text">Генерация...</p>';
      if (statusEl) statusEl.textContent = 'Генерация данных...';

      try {
        const resp = await fetch(`${API_BASE}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template_id: selectedTemplate, rows, columns }),
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.detail || 'Ошибка генерации');
        }

        const result = await resp.json();
        generatedData = result.data;

        renderGenPreviewTable(generatedData, columns);
        if (statusEl) statusEl.textContent = `Сгенерировано ${generatedData.length} строк`;
        if (dlBtn) dlBtn.disabled = false;

      } catch (e) {
        if (preview) preview.innerHTML = `<p class="gen-progress-text" style="color:#ff8a8a">Ошибка: ${e.message}</p>`;
        if (statusEl) statusEl.textContent = '';
        showNotification('Ошибка: ' + e.message);
      }
    }

    function renderGenPreviewTable(data, columns) {
      const wrap = document.getElementById('gen-preview-table-wrap');
      if (!wrap || !data || data.length === 0) return;

      const cols = columns && columns.length > 0 ? columns : Object.keys(data[0]);
      const COLUMN_LABELS_LOCAL = {
        full_name: 'ФИО', email: 'Email', phone: 'Телефон', city: 'Город',
        registration_date: 'Дата рег.', order_id: 'ID заказа',
        user_id: 'ID польз.', date: 'Дата', amount: 'Сумма', status: 'Статус',
      };

      const preview = data.slice(0, 5);
      let html = '<div class="gen-table-scroll"><table class="gen-preview-table"><thead><tr>';
      cols.forEach(c => { html += `<th>${COLUMN_LABELS_LOCAL[c] || c}</th>`; });
      html += '</tr></thead><tbody>';
      preview.forEach(row => {
        html += '<tr>';
        cols.forEach(c => { html += `<td>${row[c] ?? ''}</td>`; });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      if (data.length > 5) {
        html += `<p class="gen-table-more">Показано 5 из ${data.length} строк</p>`;
      }
      wrap.innerHTML = html;
    }

    // ── Download ───────────────────────────────────
    function downloadGenResult() {
      if (!generatedData || generatedData.length === 0) return;
      if (window._settings?.confirmDownload) {
        if (!confirm(`Скачать файл ${selectedTemplate}_generated.csv (${generatedData.length} строк)?`)) return;
      }
      const cols = Object.keys(generatedData[0]);
      let csv = cols.join(',') + '\n';
      generatedData.forEach(row => {
        csv += cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${selectedTemplate}_generated.csv`; a.click();
      URL.revokeObjectURL(url);
      showNotification(`Файл ${selectedTemplate}_generated.csv скачан!`);
    }

  } // end generation page

  /* ============================================
     anonymization.js — page: anonymization.html
     ============================================ */

  if (document.getElementById('anon-step-1')) {

    // ── State ──────────────────────────────────────
    let currentStep = 1;
    let uploadedFile = null;
    let analyzedData = null;
    let anonymizedData = null;
    let availableMethods = [];

    const anonSteps = [
      document.getElementById('anon-step-1'),
      document.getElementById('anon-step-2'),
      document.getElementById('anon-step-3'),
    ];

    const anonPageEl      = document.getElementById('page-anonymization');
    const anonStepCircles = anonPageEl.querySelectorAll('.gen-step');
    const anonStepLines   = anonPageEl.querySelectorAll('.gen-step-line');

    // ── Click on step circles to navigate ─────────
    anonStepCircles.forEach((el, i) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const target = i + 1;
        if (target < currentStep) {
          goToAnonStep(target);
        } else if (target === currentStep + 1) {
          if (target === 2 && uploadedFile) {
            analyzeFile();
          } else if (target === 3 && analyzedData) {
            runAnonymization();
          } else {
            showNotification('Сначала выполните текущий шаг');
          }
        }
      });
    });

    // ── Reset anonymization state ──────────────────
    function resetAnonState() {
      anonymizedData = null;
      analyzedData   = null;
      clearFile();
      const dlBtn    = document.getElementById('anon-btn-download');
      if (dlBtn) dlBtn.disabled = true;
      const previewEl = document.getElementById('anon-preview-table-wrap');
      if (previewEl) previewEl.innerHTML = '<p class="gen-progress-text">Анонимизация...</p>';
      const statusEl = document.getElementById('anon-step3-status');
      if (statusEl) statusEl.textContent = '';
      goToAnonStep(1);
    }
    window._resetAnonState = resetAnonState;

    // ── Mode switcher ──────────────────────────────
    document.getElementById('btn-generate-mode')?.addEventListener('click', () => {
      showPage('generation');
    });

    // ── Fetch available methods ────────────────────
    async function loadMethods() {
      try {
        const resp = await fetch(`${API_BASE}/api/anonymize/methods`);
        if (resp.ok) {
          const data = await resp.json();
          availableMethods = data.methods || [];
        }
      } catch (e) {
        availableMethods = [
          { id: 'none',   label: 'Без изменений', parameters: [] },
          { id: 'mask',   label: 'Маскирование',  parameters: [
            { name: 'start',  label: 'Начать с (индекс)',    type: 'number', default: 0 },
            { name: 'length', label: 'Количество символов',  type: 'number', default: 5 },
          ]},
          { id: 'redact', label: 'Удаление',       parameters: [] },
          { id: 'hash',   label: 'Хеш (MD5)',      parameters: [] },
          { id: 'sha256', label: 'Хеш (SHA-256)',  parameters: [] },
          { id: 'sha1',   label: 'Хеш (SHA-1)',    parameters: [] },
        ];
      }
    }

    loadMethods();

    // ── File upload ────────────────────────────────
    const uploadArea = document.getElementById('anon-upload-area');
    const fileChosen = document.getElementById('anon-file-chosen');
    const fileName   = document.getElementById('anon-file-name');
    const fileSize   = document.getElementById('anon-file-size');
    const nextBtn1   = document.getElementById('anon-btn-next-1');

    let fileInput = document.getElementById('anon-file-input');

    function bindFileInput() {
      fileInput.addEventListener('change', () => {
        if (fileInput.files?.[0]) handleFileSelect(fileInput.files[0]);
      });
    }
    bindFileInput();

    function refreshFileInput() {
      const newInput = document.createElement('input');
      newInput.type   = 'file';
      newInput.id     = 'anon-file-input';
      newInput.accept = '.csv';
      newInput.style.display = 'none';
      fileInput.parentNode.replaceChild(newInput, fileInput);
      fileInput = newInput;
      bindFileInput();
    }

    uploadArea?.addEventListener('click', () => {
      fileInput.click();
    });

    uploadArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea?.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileSelect(file);
    });

    document.getElementById('anon-file-remove')?.addEventListener('click', (e) => {
      e.stopPropagation();
      clearFile();
    });

    function handleFileSelect(file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        showNotification('Пожалуйста, загрузите CSV-файл');
        refreshFileInput();
        return;
      }
      uploadedFile = file;
      fileName.textContent = file.name;
      fileSize.textContent = formatBytes(file.size);
      uploadArea.style.display = 'none';
      fileChosen.style.display = 'flex';
      nextBtn1.disabled = false;
    }

    function clearFile() {
      uploadedFile = null;
      refreshFileInput();
      uploadArea.style.display = '';
      fileChosen.style.display = 'none';
      nextBtn1.disabled = true;
    }

    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ── Navigation ─────────────────────────────────
    document.getElementById('anon-btn-next-1')?.addEventListener('click', async () => {
      await analyzeFile();
    });

    document.getElementById('anon-btn-next-2')?.addEventListener('click', async () => {
      await runAnonymization();
    });

    document.getElementById('anon-btn-back-2')?.addEventListener('click', () => goToAnonStep(1));
    document.getElementById('anon-btn-back-3')?.addEventListener('click', () => goToAnonStep(2));
    document.getElementById('anon-btn-download')?.addEventListener('click', downloadAnonResult);

    // ── Analyze file ───────────────────────────────
    async function analyzeFile() {
      if (!uploadedFile) return;
      const btn = document.getElementById('anon-btn-next-1');
      btn.disabled = true;
      btn.textContent = 'Анализ...';

      try {
        const formData = new FormData();
        formData.append('file', uploadedFile);

        const resp = await fetch(`${API_BASE}/api/analyze`, {
          method: 'POST',
          body: formData,
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.detail || 'Ошибка анализа файла');
        }

        analyzedData = await resp.json();
        renderColumnsTable();
        goToAnonStep(2);

      } catch (e) {
        showNotification('Ошибка: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Далее';
      }
    }

    // ── Render columns table ───────────────────────
    function renderColumnsTable() {
      const container = document.getElementById('anon-cols-table');
      if (!container || !analyzedData) return;

      const methodOptions = availableMethods.map(m =>
        `<option value="${m.id}">${m.label}</option>`
      ).join('');

      let html = `
        <div class="anon-cols-header">
          <span>Колонка</span>
          <span>Примеры значений</span>
          <span>Метод анонимизации</span>
        </div>
      `;

      analyzedData.columns.forEach(col => {
        const samples = (col.sample_values || []).slice(0, 2).join('<br>');
        html += `
          <div class="anon-col-row" data-col="${col.name}">
            <span class="anon-col-name">${col.name}</span>
            <div class="anon-col-sample">${samples ? samples.split('<br>').map(s => `<span>${s}</span>`).join('') : '<span style="color:rgba(255,255,255,0.2)">—</span>'}</div>
            <div class="anon-method-cell">
              <select class="anon-method-select" data-col="${col.name}">
                ${methodOptions}
              </select>
              <div class="anon-mask-params" style="display:none;">
                <label class="anon-mask-label">с позиции <input type="number" class="anon-mask-input anon-mask-start" min="0" value="0" /></label>
                <label class="anon-mask-label">кол-во символов <input type="number" class="anon-mask-input anon-mask-length" min="1" value="5" /></label>
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      container.querySelectorAll('.anon-method-select').forEach(sel => {
        sel.addEventListener('change', () => {
          const row = sel.closest('.anon-col-row');
          row?.classList.toggle('has-method', sel.value !== 'none');
          const maskParams = row?.querySelector('.anon-mask-params');
          if (maskParams) {
            const selectedMethod = availableMethods.find(m => m.id === sel.value);
            const hasParams = selectedMethod?.parameters && selectedMethod.parameters.length > 0;
            maskParams.style.display = hasParams ? 'flex' : 'none';
            // Apply defaults from API response
            if (hasParams) {
              selectedMethod.parameters.forEach(param => {
                if (param.name === 'start') {
                  const input = maskParams.querySelector('.anon-mask-start');
                  if (input && input.value === '0') input.value = param.default ?? 0;
                }
                if (param.name === 'length') {
                  const input = maskParams.querySelector('.anon-mask-length');
                  if (input && input.value === '5') input.value = param.default ?? 5;
                }
              });
            }
          }
        });
      });
    }

    function getRules() {
      const rules = {};
      document.querySelectorAll('.anon-method-select').forEach(sel => {
        const col    = sel.dataset.col;
        const method = sel.value;
        if (method && method !== 'none') {
          const selectedMethod = availableMethods.find(m => m.id === method);
          const hasParams = selectedMethod?.parameters && selectedMethod.parameters.length > 0;
          if (hasParams) {
            const row = sel.closest('.anon-col-row');
            const startEl  = row?.querySelector('.anon-mask-start');
            const lengthEl = row?.querySelector('.anon-mask-length');
            const start  = startEl  ? parseInt(startEl.value,  10) : 0;
            const length = lengthEl ? parseInt(lengthEl.value, 10) : 5;
            rules[col] = { method, start, length };
          } else {
            rules[col] = method;
          }
        }
      });
      return rules;
    }

    // ── Run anonymization ──────────────────────────
    async function runAnonymization() {
      if (!uploadedFile || !analyzedData) return;

      const btn = document.getElementById('anon-btn-next-2');
      btn.disabled = true;
      btn.textContent = 'Обработка...';
      goToAnonStep(3);

      const statusEl  = document.getElementById('anon-step3-status');
      const previewEl = document.getElementById('anon-preview-table-wrap');
      const dlBtn     = document.getElementById('anon-btn-download');

      if (previewEl) previewEl.innerHTML = '<p class="gen-progress-text">Анонимизация данных...</p>';
      if (statusEl)  statusEl.textContent = '';
      if (dlBtn)     dlBtn.disabled = true;

      try {
        const rules    = getRules();
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('rules', JSON.stringify(rules));

        const resp = await fetch(`${API_BASE}/api/anonymize`, {
          method: 'POST',
          body: formData,
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.detail || 'Ошибка анонимизации');
        }

        const csvText = await resp.text();
        anonymizedData = parseCsv(csvText);

        renderAnonPreviewTable(anonymizedData, Object.keys(anonymizedData[0] || {}));
        if (statusEl) statusEl.textContent = `Обработано ${anonymizedData.length} строк`;
        if (dlBtn)    dlBtn.disabled = false;

      } catch (e) {
        if (previewEl) previewEl.innerHTML = `<p class="gen-progress-text" style="color:#ff8a8a">Ошибка: ${e.message}</p>`;
        showNotification('Ошибка: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Далее';
      }
    }

    function parseCsv(text) {
      const lines = text.trim().split('\n');
      if (lines.length < 1) return [];
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      return lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const row  = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
        return row;
      });
    }

    function renderAnonPreviewTable(data, columns) {
      const wrap = document.getElementById('anon-preview-table-wrap');
      if (!wrap || !data || data.length === 0) {
        if (wrap) wrap.innerHTML = '<p class="gen-progress-text">Нет данных для отображения</p>';
        return;
      }
      const cols    = columns && columns.length > 0 ? columns : Object.keys(data[0]);
      const preview = data.slice(0, 5);

      let html = '<div class="gen-table-scroll"><table class="gen-preview-table anon-preview-table"><thead><tr>';
      cols.forEach(c => { html += `<th>${c}</th>`; });
      html += '</tr></thead><tbody>';
      preview.forEach(row => {
        html += '<tr>';
        cols.forEach(c => {
          const val = String(row[c] ?? '');
          const truncated = val.length > 18 ? val.slice(0, 16) + '…' : val;
          html += `<td title="${val.replace(/"/g, '&quot;')}">${truncated}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      if (data.length > 5) {
        html += `<p class="gen-table-more">Показано 5 из ${data.length} строк</p>`;
      }
      wrap.innerHTML = html;
    }

    // ── Download ───────────────────────────────────
    function downloadAnonResult() {
      if (!anonymizedData || anonymizedData.length === 0) return;
      if (window._settings?.confirmDownload) {
        const fname = `anonymized_${uploadedFile?.name || 'result.csv'}`;
        if (!confirm(`Скачать файл ${fname} (${anonymizedData.length} строк)?`)) return;
      }
      const cols = Object.keys(anonymizedData[0]);
      let csv = cols.join(',') + '\n';
      anonymizedData.forEach(row => {
        csv += cols.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `anonymized_${uploadedFile?.name || 'result.csv'}`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Файл скачан!');
    }

    // ── Step transition ────────────────────────────
    function goToAnonStep(n) {
      const current = anonSteps[currentStep - 1];
      const next    = anonSteps[n - 1];
      const forward = n > currentStep;

      if (current && current !== next) {
        current.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        current.style.opacity    = '0';
        current.style.transform  = forward ? 'translateY(-18px) scale(0.98)' : 'translateY(18px) scale(0.98)';
        setTimeout(() => {
          current.classList.add('gen-content--hidden');
          current.style.transition = '';
          current.style.opacity    = '';
          current.style.transform  = '';

          next.classList.remove('gen-content--hidden');
          next.style.opacity   = '0';
          next.style.transform = forward ? 'translateY(24px) scale(0.98)' : 'translateY(-24px) scale(0.98)';
          requestAnimationFrame(() => {
            next.style.transition = 'opacity 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.35s cubic-bezier(0.4,0,0.2,1)';
            next.style.opacity    = '1';
            next.style.transform  = 'translateY(0) scale(1)';
            setTimeout(() => {
              next.style.transition = '';
              next.style.opacity    = '';
              next.style.transform  = '';
            }, 360);
          });
        }, 200);
      } else if (next) {
        next.classList.remove('gen-content--hidden');
      }

      currentStep = n;
      updateAnonStepUI();
    }

    function updateAnonStepUI() {
      anonStepCircles.forEach((el, i) => {
        el.classList.remove('gen-step--active', 'gen-step--done');
        if (i + 1 === currentStep) el.classList.add('gen-step--active');
        else if (i + 1 < currentStep) el.classList.add('gen-step--done');
      });
      anonStepLines.forEach((line, i) => {
        if (i + 1 < currentStep) {
          line.classList.add('done');
          line.style.background = 'rgba(174, 255, 244, 0.6)';
        } else {
          line.classList.remove('done');
          line.style.background = '';
        }
      });
    }

  } // end anonymization page

  /* ============================================
     Shared notification utility
     ============================================ */

  function showNotification(message) {
    document.querySelectorAll('.notify').forEach(n => n.remove());
    const notify = document.createElement('div');
    notify.className = 'notify';
    notify.textContent = message;
    document.body.appendChild(notify);
    if (!document.getElementById('notify-styles')) {
      const style = document.createElement('style');
      style.id = 'notify-styles';
      style.textContent = `
        .notify { position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);
          background:rgba(11,37,42,0.96);border:1px solid rgba(125,233,239,0.4);border-radius:12px;
          padding:14px 28px;font-family:'Jost',sans-serif;font-size:16px;font-weight:300;color:#AEFFF4;
          z-index:9999;opacity:0;transition:opacity 0.3s ease,transform 0.3s ease;white-space:nowrap;
          pointer-events:none;max-width:90vw;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.4); }
        .notify.show { opacity:1;transform:translateX(-50%) translateY(0); }`;
      document.head.appendChild(style);
    }
    requestAnimationFrame(() => notify.classList.add('show'));
    setTimeout(() => { notify.classList.remove('show'); setTimeout(() => notify.remove(), 350); }, 3000);
  }

  // Make showNotification accessible to inner scopes via closure — already in scope above.

  // ── Page leave hook: reset state when navigating away ──
  window._onPageLeave = function(leavingPage) {
    if (leavingPage === 'generation'     && window._resetGenState)  window._resetGenState();
    if (leavingPage === 'anonymization'  && window._resetAnonState) window._resetAnonState();
  };

});
