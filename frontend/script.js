/**
 * Combined script.js for:
 * - Home page (firstpage)
 * - Generate page (generate)
 * - Anonymize page (anonym)
 */

// ============================================================================
// SECTION 0: Шапка — «Настройки» (язык, тема)
// ============================================================================
(function () {
    "use strict";

    var STORAGE_THEME = "appTheme";
    var STORAGE_LANG = "appLang";

    function applyTheme(mode) {
        var isDark = mode === "dark";
        var navLogo = document.getElementById("nav-logo-img");
        if (isDark) {
            document.documentElement.setAttribute("data-theme", "dark");
            if (navLogo) navLogo.src = "/pictures/logo_dark.svg";
        } else {
            document.documentElement.removeAttribute("data-theme");
            if (navLogo) navLogo.src = "/pictures/star_logo.svg";
        }
        try {
            localStorage.setItem(STORAGE_THEME, isDark ? "dark" : "light");
        } catch (e) { /* ignore */ }
        document.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
            var t = btn.getAttribute("data-theme-choice");
            btn.classList.toggle("is-active", isDark ? t === "dark" : t === "light");
        });
    }

    function applyLang(code) {
        var c = code === "en" ? "en" : "ru";
        document.documentElement.lang = c === "en" ? "en" : "ru";
        try {
            localStorage.setItem(STORAGE_LANG, c);
        } catch (e) { /* ignore */ }
        document.querySelectorAll("[data-lang]").forEach(function (btn) {
            var t = btn.getAttribute("data-lang");
            btn.classList.toggle("is-active", t === c);
        });
    }

    function closeNavMenu() {
        var wrap = document.querySelector("[data-nav-settings]");
        if (!wrap) return;
        var menu = wrap.querySelector(".nav-dropdown__menu");
        var trigger = wrap.querySelector(".nav-dropdown__trigger");
        wrap.classList.remove("is-open");
        if (menu) menu.hidden = true;
        if (trigger) trigger.setAttribute("aria-expanded", "false");
    }

    function toggleNavMenu(e) {
        if (e) e.stopPropagation();
        var wrap = document.querySelector("[data-nav-settings]");
        if (!wrap) return;
        var menu = wrap.querySelector(".nav-dropdown__menu");
        var trigger = wrap.querySelector(".nav-dropdown__trigger");
        var willOpen = !wrap.classList.contains("is-open");
        if (willOpen) wrap.classList.add("is-open");
        else wrap.classList.remove("is-open");
        if (menu) menu.hidden = !willOpen;
        if (trigger) trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    }

    document.addEventListener("DOMContentLoaded", function () {
        try {
            var sTheme = localStorage.getItem(STORAGE_THEME);
            applyTheme(sTheme === "dark" ? "dark" : "light");
        } catch (err) {
            applyTheme("light");
        }

        try {
            var sLang = localStorage.getItem(STORAGE_LANG);
            applyLang(sLang === "en" ? "en" : "ru");
        } catch (err2) {
            applyLang("ru");
        }

        var wrap = document.querySelector("[data-nav-settings]");
        if (!wrap) return;

        var trigger = wrap.querySelector(".nav-dropdown__trigger");
        var menu = wrap.querySelector(".nav-dropdown__menu");

        if (trigger) {
            trigger.addEventListener("click", toggleNavMenu);
        }

        if (menu) {
            menu.addEventListener("click", function (ev) {
                ev.stopPropagation();
            });
        }

        wrap.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                applyTheme(btn.getAttribute("data-theme-choice"));
                closeNavMenu();
            });
        });

        wrap.querySelectorAll("[data-lang]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                applyLang(btn.getAttribute("data-lang"));
                closeNavMenu();
            });
        });

        document.addEventListener("click", closeNavMenu);
        document.addEventListener("keydown", function (ev) {
            if (ev.key === "Escape") closeNavMenu();
        });
    });
})();

// ============================================================================
// SECTION 1: Anonymize Page Functions
// ============================================================================
(function () {
    "use strict";

    var API_BASE = window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "http://2.26.8.117:8000";
    var API_ANALYZE = "/api/analyze";
    var API_ANONYM = "/api/anonymize";
    var API_METHODS = "/api/anonymize/methods";

    // DOM элементы
    var input = document.getElementById("csv-file-input");
    var btnPick = document.getElementById("btn-pick-file");
    var uploadFeedback = document.getElementById("upload-feedback");
    var previewSection = document.getElementById("preview-section-anonym");
    var previewThead = document.getElementById("preview-thead-anonym");
    var previewTbody = document.getElementById("preview-tbody-anonym");
    var configSection = document.getElementById("anonym-config-section");
    var configTbody = document.getElementById("config-tbody");
    var btnReset = document.getElementById("btn-reset-config");
    var btnAnonymize = document.getElementById("btn-anonymize");
    var actionsFeedback = document.getElementById("actions-feedback");
    var btnDownload = document.getElementById("btn-download-final");

    // Состояние
    var anonymMethodsCache = null;
    var currentFile = null;
    var currentFileName = null;
    var currentRules = {};
    var anonymizedBlob = null;

    // ========== ПОЛУЧЕНИЕ МЕТОДОВ С БЭКЕНДА ==========
    function loadAnonymMethods() {
        if (anonymMethodsCache) {
            return Promise.resolve(anonymMethodsCache);
        }
        return fetch(API_BASE + API_METHODS, {
            method: "GET",
            headers: { "Accept": "application/json" }
        })
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function (data) {
                var methods = data.methods || data;
                if (!Array.isArray(methods)) methods = [];
                anonymMethodsCache = methods;
                return anonymMethodsCache;
            })
            .catch(function () {
                anonymMethodsCache = [
                    { id: "mask", label: "Маскирование", parameters: [], example: "i***@mail.ru" },
                    { id: "redact", label: "Удаление", parameters: [], example: "(пусто)" },
                    { id: "hash", label: "Хеширование", parameters: [], example: "a1b2c3d4" }
                ];
                return anonymMethodsCache;
            });
    }

    function getMethodById(id) {
        if (!anonymMethodsCache) return null;
        for (var i = 0; i < anonymMethodsCache.length; i++) {
            if (anonymMethodsCache[i].id === id) return anonymMethodsCache[i];
        }
        return null;
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    function clearElement(el) {
        while (el && el.firstChild) el.removeChild(el.firstChild);
    }

    function setUploadFeedback(text, isError) {
        if (uploadFeedback) {
            uploadFeedback.textContent = text;
            uploadFeedback.classList.toggle("upload-feedback--error", !!isError);
        }
    }

    function setActionsFeedback(text, type) {
        if (actionsFeedback) {
            actionsFeedback.textContent = text;
            actionsFeedback.className = "feedback-large";
            if (type === "error") {
                actionsFeedback.classList.add("feedback-large--error", "show");
            } else if (type === "success") {
                actionsFeedback.classList.add("feedback-large--success", "show");
            } else if (type === "loading") {
                actionsFeedback.classList.add("feedback-large--loading", "show");
            } else {
                actionsFeedback.classList.remove("show");
            }
        }
    }

    function hideActionsFeedback() {
        if (actionsFeedback) {
            actionsFeedback.classList.remove("show");
            actionsFeedback.className = "feedback-large";
        }
    }

    function hidePostUploadBlocks() {
        if (previewSection) previewSection.hidden = true;
        if (configSection) configSection.hidden = true;
        clearElement(previewThead);
        clearElement(previewTbody);
        clearElement(configTbody);
    }

    function resetConfigUi() {
        if (!configTbody) return;
        configTbody.querySelectorAll("[data-dropdown]").forEach(function (root) {
            var valueEl = root.querySelector(".custom-select__value");
            var hidden = root.querySelector('input[type="hidden"]');
            if (valueEl) valueEl.textContent = "Выберите метод";
            if (hidden) hidden.value = "";
            root.classList.remove("has-value");
        });
        configTbody.querySelectorAll("tr").forEach(function (tr) {
            var tdParams = tr.querySelector("[data-params-cell]");
            var tdEx = tr.querySelector("[data-example-cell]");
            if (tdParams) tdParams.textContent = "—";
            if (tdEx) tdEx.textContent = "—";
        });
        currentRules = {};
        hideActionsFeedback();
        if (btnDownload) btnDownload.hidden = true;
        anonymizedBlob = null;
    }

    // ========== ПАРСИНГ CSV ==========
    function parseCSVLine(line) {
        var result = [], current = "", inQuotes = false;
        for (var i = 0; i < line.length; i++) {
            var c = line[i];
            if (c === '"') inQuotes = !inQuotes;
            else if (c === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
            } else current += c;
        }
        result.push(current.trim());
        return result;
    }

    function parseCSV(text) {
        var lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
        var rows = [];
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].trim() !== "") rows.push(parseCSVLine(lines[i]));
        }
        return rows;
    }

    // ========== ОТОБРАЖЕНИЕ ПРЕДПРОСМОТРА ==========
    function renderPreview(header, dataRows) {
        if (!previewThead || !previewTbody) return;
        clearElement(previewThead);
        clearElement(previewTbody);
        var trh = document.createElement("tr");
        header.forEach(function (cell) {
            var th = document.createElement("th");
            th.textContent = cell;
            trh.appendChild(th);
        });
        previewThead.appendChild(trh);
        dataRows.forEach(function (row) {
            var tr = document.createElement("tr");
            for (var c = 0; c < header.length; c++) {
                var td = document.createElement("td");
                td.textContent = row[c] != null ? row[c] : "";
                tr.appendChild(td);
            }
            previewTbody.appendChild(tr);
        });
    }

    // ========== СОЗДАНИЕ ВЫПАДАЮЩИХ СПИСКОВ ==========
    function closeAllDropdowns() {
        document.querySelectorAll("[data-dropdown].is-open").forEach(function (root) {
            root.classList.remove("is-open");
            var list = root.querySelector(".custom-select__list");
            if (list) list.hidden = true;
        });
    }

    function createOptionsDropdown(items, onSelect) {
        var root = document.createElement("div");
        root.className = "custom-select custom-select--cell";
        root.setAttribute("data-dropdown", "");

        var bar = document.createElement("div");
        bar.className = "custom-select__bar";
        bar.setAttribute("role", "button");
        bar.setAttribute("tabindex", "0");

        var valueEl = document.createElement("span");
        valueEl.className = "custom-select__value";
        valueEl.textContent = "Выберите метод";

        var toggle = document.createElement("span");
        toggle.className = "custom-select__toggle";
        var bird = document.createElement("img");
        bird.className = "custom-select__bird";
        bird.src = "/pictures/bird.svg";
        bird.alt = "";
        bird.width = 17;
        bird.height = 15;
        toggle.appendChild(bird);

        bar.appendChild(valueEl);
        bar.appendChild(toggle);

        var list = document.createElement("ul");
        list.className = "custom-select__list";
        list.hidden = true;

        items.forEach(function (item) {
            var li = document.createElement("li");
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "custom-select__option";
            btn.setAttribute("data-value", item.value);
            btn.textContent = item.label;
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                valueEl.textContent = item.label;
                var hidden = document.createElement("input");
                hidden.type = "hidden";
                hidden.name = "method";
                hidden.value = item.value;
                var oldHidden = root.querySelector('input[type="hidden"]');
                if (oldHidden) oldHidden.remove();
                root.appendChild(hidden);
                root.classList.add("has-value");
                closeAllDropdowns();
                if (onSelect) onSelect(item.value);
            });
            li.appendChild(btn);
            list.appendChild(li);
        });

        root.appendChild(bar);
        root.appendChild(list);

        bar.addEventListener("click", function (e) {
            e.stopPropagation();
            var willOpen = !root.classList.contains("is-open");
            closeAllDropdowns();
            if (willOpen) {
                root.classList.add("is-open");
                list.hidden = false;
            }
        });

        return root;
    }

    // ========== ПОСТРОЕНИЕ ТАБЛИЦЫ НАСТРОЕК ==========
    function buildConfigRows(columns) {
        if (!configTbody || !anonymMethodsCache) return;
        clearElement(configTbody);
        currentRules = {};

        var methodItems = anonymMethodsCache.map(function (m) {
            return { value: m.id, label: m.label };
        });

        columns.forEach(function (colName, idx) {
            var tr = document.createElement("tr");
            tr.dataset.columnName = colName;

            var tdCol = document.createElement("td");
            tdCol.textContent = colName;
            tr.appendChild(tdCol);

            var tdMethod = document.createElement("td");
            var selectRoot = createOptionsDropdown(methodItems, function (methodId) {
                currentRules[colName] = { method: methodId, params: {} };
                var methodDef = getMethodById(methodId);
                var tdParams = tr.querySelector("[data-params-cell]");
                var tdEx = tr.querySelector("[data-example-cell]");
                if (tdParams) tdParams.textContent = methodDef && methodDef.example ? methodDef.example : "—";
                if (tdEx && methodDef && methodDef.example) tdEx.textContent = methodDef.example;
                else if (tdEx) tdEx.textContent = "—";
            });
            tdMethod.appendChild(selectRoot);
            tr.appendChild(tdMethod);

            var tdParams = document.createElement("td");
            tdParams.setAttribute("data-params-cell", "true");
            tdParams.textContent = "—";
            tr.appendChild(tdParams);

            var tdEx = document.createElement("td");
            tdEx.setAttribute("data-example-cell", "true");
            tdEx.textContent = "—";
            tr.appendChild(tdEx);

            configTbody.appendChild(tr);
        });
    }

    // ========== АНАЛИЗ ФАЙЛА ==========
    function analyzeAndDisplay(file) {
        setUploadFeedback("Анализ файла...", false);
        var formData = new FormData();
        formData.append("file", file);

        fetch(API_BASE + API_ANALYZE, {
            method: "POST",
            body: formData
        })
            .then(function (res) {
                if (!res.ok) return res.text().then(function (text) { throw new Error(text); });
                return res.json();
            })
            .then(function (data) {
                var header = data.columns ? data.columns.map(function (c) { return c.name; }) : [];
                var preview = data.preview_data || [];
                if (!header.length && preview.length) header = preview[0] || [];
                buildConfigRows(header);
                if (previewSection) previewSection.hidden = true;
                if (configSection) configSection.hidden = false;
                setUploadFeedback(file.name, false);
                currentFile = file;
                currentFileName = file.name;
                hideActionsFeedback();
                if (btnDownload) btnDownload.hidden = true;
                anonymizedBlob = null;
            })
            .catch(function (err) {
                console.error(err);
                setUploadFeedback("Ошибка анализа: " + err.message, true);
                hidePostUploadBlocks();
            });
    }

    // ========== АНОНИМИЗАЦИЯ ==========
    function sendAnonymize() {
        if (!currentFile) {
            setActionsFeedback("Сначала загрузите CSV файл", "error");
            return;
        }

        var rules = {};
        var allRows = configTbody.querySelectorAll("tr");
        for (var i = 0; i < allRows.length; i++) {
            var colName = allRows[i].dataset.columnName;
            var selectRoot = allRows[i].querySelector("[data-dropdown]");
            var hidden = selectRoot ? selectRoot.querySelector('input[type="hidden"]') : null;
            var methodId = hidden ? hidden.value : "";
            if (colName && methodId) {
                rules[colName] = { method: methodId, params: {} };
            }
        }

        if (Object.keys(rules).length === 0) {
            setActionsFeedback("Выберите метод анонимизации хотя бы для одной колонки", "error");
            return;
        }

        btnAnonymize.disabled = true;
        btnAnonymize.classList.add("btn-main-action--loading");
        setActionsFeedback("Анонимизация данных...", "loading");

        var formData = new FormData();
        formData.append("file", currentFile);
        formData.append("rules", JSON.stringify(rules));

        fetch(API_BASE + API_ANONYM, {
            method: "POST",
            body: formData
        })
            .then(function (res) {
                if (!res.ok) return res.text().then(function (text) { throw new Error(text); });
                return res.blob();
            })
            .then(function (blob) {
                anonymizedBlob = blob;
                return blob.text().then(function (csvText) {
                    var rows = parseCSV(csvText);
                    if (!rows.length) {
                        throw new Error("Сервер вернул пустой CSV");
                    }
                    var header = rows[0] || [];
                    var previewRows = rows.slice(1, 6);
                    renderPreview(header, previewRows);
                    if (previewSection) previewSection.hidden = false;
                });
            })
            .then(function () {
                hideActionsFeedback();
                if (btnDownload) btnDownload.hidden = false;
            })
            .catch(function (err) {
                console.error(err);
                setActionsFeedback("Ошибка анонимизации: " + err.message, "error");
            })
            .finally(function () {
                btnAnonymize.disabled = false;
                btnAnonymize.classList.remove("btn-main-action--loading");
            });
    }

    // ========== СКАЧИВАНИЕ ==========
    function downloadAnonymized() {
        if (!anonymizedBlob) {
            setActionsFeedback("Нет готового файла для скачивания", "error");
            return;
        }
        var url = URL.createObjectURL(anonymizedBlob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "anonymized_" + (currentFileName || "data.csv");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
    document.addEventListener("DOMContentLoaded", function () {
        if (btnPick && input) {
            btnPick.addEventListener("click", function () { input.click(); });
        }

        if (input) {
            input.addEventListener("change", function () {
                var file = input.files && input.files[0];
                if (!file) return;
                if (!file.name.toLowerCase().endsWith(".csv")) {
                    setUploadFeedback("Только CSV файлы", true);
                    hidePostUploadBlocks();
                    return;
                }
                loadAnonymMethods().then(function () {
                    analyzeAndDisplay(file);
                });
            });
        }

        if (btnReset) {
            btnReset.addEventListener("click", resetConfigUi);
        }

        if (btnAnonymize) {
            btnAnonymize.addEventListener("click", sendAnonymize);
        }

        if (btnDownload) {
            btnDownload.addEventListener("click", downloadAnonymized);
        }

        document.addEventListener("click", closeAllDropdowns);

        if (btnDownload) btnDownload.hidden = true;
        hideActionsFeedback();
    });
})();

// ============================================================================
// SECTION 2: Generate Page Functions
// ============================================================================
(function () {
    "use strict";

    var API_BASE = window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "http://2.26.8.117:8000";
    var GENERATE_PATH = "/api/generate";

    var TEMPLATE_ID_BY_FILE = {
        "users.csv": "users",
        "orders.csv": "orders"
    };

    var FIELDS_BY_TEMPLATE = {
        "users.csv": [
            { label: "ФИО/имя", column: "full_name" },
            { label: "email", column: "email" },
            { label: "телефон", column: "phone" },
            { label: "город", column: "city" },
            { label: "дата регистрации", column: "registration_date" }
        ],
        "orders.csv": [
            { label: "id заказа", column: "order_id" },
            { label: "id пользователя", column: "user_id" },
            { label: "дата", column: "date" },
            { label: "сумма", column: "amount" },
            { label: "статус", column: "status" }
        ]
    };

    var lastCsvText = "";
    var lastTemplateId = "";

    document.addEventListener("DOMContentLoaded", function () {
        function closeDropdown(root) {
            if (!root) {
                return;
            }
            root.classList.remove("is-open");
            var list = root.querySelector(".custom-select__list");
            var bar = root.querySelector(".custom-select__bar");
            if (list) {
                list.hidden = true;
            }
            if (bar) {
                bar.setAttribute("aria-expanded", "false");
            }
        }

        function closeAllDropdowns() {
            document.querySelectorAll("[data-dropdown].is-open").forEach(closeDropdown);
        }

        document.querySelectorAll("[data-dropdown]").forEach(function (root) {
            var bar = root.querySelector(".custom-select__bar");
            var list = root.querySelector(".custom-select__list");
            var valueEl = root.querySelector(".custom-select__value");
            var hiddenInput = root.querySelector('input[type="hidden"]');

            if (!bar || !list) {
                return;
            }

            function toggleOpen(e) {
                if (e) {
                    e.stopPropagation();
                }
                var willOpen = !root.classList.contains("is-open");
                closeAllDropdowns();
                if (willOpen) {
                    root.classList.add("is-open");
                    list.hidden = false;
                    bar.setAttribute("aria-expanded", "true");
                }
            }

            bar.addEventListener("click", toggleOpen);

            bar.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleOpen(e);
                }
            });

            root.querySelectorAll(".custom-select__option").forEach(function (opt) {
                opt.addEventListener("click", function (e) {
                    e.stopPropagation();
                    var val = opt.getAttribute("data-value") || opt.textContent.trim();
                    if (valueEl) {
                        valueEl.textContent = val;
                    }
                    if (hiddenInput) {
                        hiddenInput.value = val;
                    }
                    root.classList.add("has-value");
                    root.classList.remove("custom-select--error");
                    closeDropdown(root);
                    bar.blur();
                    updateCheckboxes(val);
                });
            });
        });

        function updateCheckboxes(templateFile) {
            var checkboxesDiv = document.getElementById("checkboxes");
            if (!checkboxesDiv) return;
            checkboxesDiv.innerHTML = "";
            var fields = FIELDS_BY_TEMPLATE[templateFile];
            if (!fields) {
                checkboxesDiv.hidden = true;
                return;
            }
            fields.forEach(function (field) {
                var safeId = "col_" + field.column.replace(/[^a-z0-9_]/gi, "_");
                var item = document.createElement("div");
                item.className = "checkbox-item";
                var input = document.createElement("input");
                input.type = "checkbox";
                input.id = safeId;
                input.name = "fields";
                input.value = field.column;
                input.checked = true;
                var label = document.createElement("label");
                label.htmlFor = safeId;
                label.textContent = field.label;
                item.appendChild(input);
                item.appendChild(label);
                checkboxesDiv.appendChild(item);
            });
            checkboxesDiv.hidden = false;
        }

        document.addEventListener("click", function () {
            closeAllDropdowns();
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                closeAllDropdowns();
            }
        });

        var recordsInput = document.querySelector('input[name="records"]');
        function validateRecords(options) {
            if (!recordsInput) {
                return;
            }
            var fromSubmit = options && options.fromSubmit;
            var value = recordsInput.value.trim();
            if (value === "") {
                if (fromSubmit) {
                    recordsInput.classList.add("field-input--error");
                } else {
                    recordsInput.classList.remove("field-input--error");
                }
                return;
            }
            var num = parseInt(value, 10);
            if (isNaN(num) || num < 1 || num > 10000) {
                recordsInput.classList.add("field-input--error");
            } else {
                recordsInput.classList.remove("field-input--error");
            }
        }

        function recordsAreValid() {
            if (!recordsInput) {
                return false;
            }
            var value = recordsInput.value.trim();
            if (value === "") {
                return false;
            }
            var num = parseInt(value, 10);
            return !isNaN(num) && num >= 1 && num <= 10000;
        }

        if (recordsInput) {
            recordsInput.addEventListener("input", function () {
                validateRecords();
            });
            recordsInput.addEventListener("blur", function () {
                validateRecords();
            });
            recordsInput.addEventListener("keydown", function (e) {
                if (
                    (e.key >= "0" && e.key <= "9") ||
                    e.key === "Backspace" ||
                    e.key === "Delete" ||
                    e.key === "Tab" ||
                    e.key === "Escape" ||
                    e.key === "Enter" ||
                    e.key === "ArrowLeft" ||
                    e.key === "ArrowRight" ||
                    e.key === "ArrowUp" ||
                    e.key === "ArrowDown"
                ) {
                    return;
                }
                e.preventDefault();
            });
        }

        var submitBtn = document.getElementById("submit-generate") || document.querySelector(".submit-btn");
        var previewSection = document.getElementById("preview-section");
        var previewStatus = document.getElementById("preview-status");
        var previewTableWrap = document.getElementById("preview-table-wrap");
        var previewThead = document.getElementById("preview-thead");
        var previewTbody = document.getElementById("preview-tbody");
        var downloadBtn = document.getElementById("download-btn");

        function setSubmitLoading(loading) {
            if (!submitBtn) {
                return;
            }
            submitBtn.disabled = !!loading;
            submitBtn.classList.toggle("submit-btn--loading", !!loading);
        }

        function parseCSVLine(line) {
            var result = [];
            var current = "";
            var inQuotes = false;
            for (var i = 0; i < line.length; i++) {
                var c = line[i];
                if (c === '"') {
                    inQuotes = !inQuotes;
                } else if (c === "," && !inQuotes) {
                    result.push(current.trim());
                    current = "";
                } else {
                    current += c;
                }
            }
            result.push(current.trim());
            return result;
        }

        function parseCSVRows(text) {
            var lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
            var rows = [];
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].trim() !== "") {
                    rows.push(parseCSVLine(lines[i]));
                }
            }
            return rows;
        }

        function renderPreviewTable(csvText) {
            if (!previewThead || !previewTbody || !previewTableWrap) {
                return;
            }
            previewThead.innerHTML = "";
            previewTbody.innerHTML = "";
            var rows = parseCSVRows(csvText);
            if (rows.length === 0) {
                previewTableWrap.hidden = true;
                return;
            }
            var header = rows[0];
            var trh = document.createElement("tr");
            header.forEach(function (cell) {
                var th = document.createElement("th");
                th.textContent = cell;
                trh.appendChild(th);
            });
            previewThead.appendChild(trh);
            var maxData = Math.min(5, rows.length - 1);
            for (var r = 1; r <= maxData; r++) {
                var tr = document.createElement("tr");
                var row = rows[r];
                for (var c = 0; c < header.length; c++) {
                    var td = document.createElement("td");
                    td.textContent = row[c] != null ? row[c] : "";
                    tr.appendChild(td);
                }
                previewTbody.appendChild(tr);
            }
            previewTableWrap.hidden = false;
        }

        function showPreviewError(message) {
            if (!previewSection || !previewStatus) {
                return;
            }
            previewSection.hidden = false;
            previewStatus.textContent = message;
            previewStatus.classList.add("preview-status--error");
            if (previewTableWrap) {
                previewTableWrap.hidden = true;
            }
            if (downloadBtn) {
                downloadBtn.hidden = true;
            }
        }

        function showPreviewSuccess(csvText) {
            if (!previewSection || !previewStatus) {
                return;
            }
            previewSection.hidden = false;
            previewStatus.textContent = "";
            previewStatus.classList.remove("preview-status--error");
            renderPreviewTable(csvText);
            if (downloadBtn) {
                downloadBtn.hidden = false;
            }
        }

        function formatApiError(status, bodyText, jsonData) {
            if (jsonData && typeof jsonData === "object") {
                if (typeof jsonData.detail === "string") {
                    return jsonData.detail;
                }
                if (Array.isArray(jsonData.detail) && jsonData.detail.length) {
                    return jsonData.detail
                        .map(function (d) {
                            return d && typeof d.msg === "string" ? d.msg : JSON.stringify(d);
                        })
                        .join("; ");
                }
                if (jsonData.message) {
                    return String(jsonData.message);
                }
                if (jsonData.error) {
                    return String(jsonData.error);
                }
            }
            var t = (bodyText || "").trim();
            if (t && t.length < 500) {
                return t;
            }
            if (status === 400) {
                return "Некорректный запрос (например, неверный template_id).";
            }
            if (status === 422) {
                return "Ошибка валидации данных. Проверьте количество строк (1–10 000) и выбранные поля.";
            }
            if (status >= 500) {
                return "Внутренняя ошибка сервера. Попробуйте позже.";
            }
            return "Ошибка (" + status + "). Попробуйте позже.";
        }

        function extractCsvFromResponse(response, bodyText, jsonData) {
            if (jsonData && typeof jsonData === "object" && typeof jsonData.csv === "string") {
                return jsonData.csv;
            }
            var ct = (response.headers.get("content-type") || "").toLowerCase();
            if (ct.indexOf("application/json") !== -1 && jsonData && typeof jsonData === "object") {
                if (typeof jsonData.content === "string") {
                    return jsonData.content;
                }
                if (typeof jsonData.data === "string") {
                    return jsonData.data;
                }
            }
            if (typeof bodyText === "string" && bodyText.length) {
                return bodyText;
            }
            return "";
        }

        function runClientValidation() {
            var hiddenInput = document.querySelector('input[name="template"]');
            var customSelect = document.querySelector("[data-dropdown]");
            var ok = true;
            if (hiddenInput && hiddenInput.value === "") {
                if (customSelect) {
                    customSelect.classList.add("custom-select--error");
                }
                ok = false;
            } else if (customSelect) {
                customSelect.classList.remove("custom-select--error");
            }
            validateRecords({ fromSubmit: true });
            if (!recordsAreValid()) {
                ok = false;
            }
            var templateFile = hiddenInput ? hiddenInput.value : "";
            if (templateFile && FIELDS_BY_TEMPLATE[templateFile]) {
                var checked = document.querySelectorAll('#checkboxes input[name="fields"]:checked');
                if (!checked.length) {
                    ok = false;
                    showPreviewError("Выберите хотя бы одно поле для генерации.");
                    return false;
                }
            }
            return ok;
        }

        function collectSelectedColumns() {
            var cols = [];
            document.querySelectorAll('#checkboxes input[name="fields"]:checked').forEach(function (cb) {
                cols.push(cb.value);
            });
            return cols;
        }

        async function generateData() {
            if (!runClientValidation()) {
                if (previewSection) {
                    previewSection.hidden = !(previewStatus && previewStatus.textContent);
                }
                return;
            }

            var hiddenInput = document.querySelector('input[name="template"]');
            var templateFile = hiddenInput ? hiddenInput.value : "";
            var templateId = TEMPLATE_ID_BY_FILE[templateFile];
            var rows = parseInt(recordsInput && recordsInput.value.trim(), 10);
            var columns = collectSelectedColumns();

            setSubmitLoading(true);
            if (previewStatus) {
                previewStatus.textContent = "Генерация…";
                previewStatus.classList.remove("preview-status--error");
            }
            if (previewSection) {
                previewSection.hidden = false;
            }
            if (previewTableWrap) {
                previewTableWrap.hidden = true;
            }
            if (downloadBtn) {
                downloadBtn.hidden = true;
            }

            var payload = {
                template_id: templateId,
                rows: rows,
                columns: columns
            };

            try {
                var res = await fetch(API_BASE + GENERATE_PATH, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                var bodyText = await res.text();
                var jsonData = null;
                try {
                    jsonData = JSON.parse(bodyText);
                } catch (e) {
                    jsonData = null;
                }

                if (!res.ok) {
                    showPreviewError(formatApiError(res.status, bodyText, jsonData));
                    return;
                }

                var csvText = extractCsvFromResponse(res, bodyText, jsonData);
                if (!csvText || !csvText.trim()) {
                    showPreviewError("Сервер не вернул CSV. Уточните формат ответа у бэкенда.");
                    return;
                }

                lastCsvText = csvText;
                lastTemplateId = templateId;
                showPreviewSuccess(csvText);
            } catch (err) {
                var net =
                    err && err.message
                        ? err.message
                        : "Не удалось связаться с сервером. Проверьте, что API запущен на " + API_BASE + " и CORS разрешает этот сайт.";
                showPreviewError(net);
            } finally {
                setSubmitLoading(false);
            }
        }

        function downloadCsv() {
            if (!lastCsvText) {
                return;
            }
            var blob = new Blob([lastCsvText], { type: "text/csv;charset=utf-8;" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = (lastTemplateId || "data") + "_" + Date.now() + ".csv";
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        if (downloadBtn) {
            downloadBtn.addEventListener("click", downloadCsv);
        }

        if (submitBtn) {
            submitBtn.addEventListener("click", function () {
                if (previewStatus) {
                    previewStatus.classList.remove("preview-status--error");
                    previewStatus.textContent = "";
                }
                if (!runClientValidation()) {
                    if (previewSection && previewStatus && previewStatus.textContent) {
                        previewSection.hidden = false;
                    } else if (previewSection) {
                        previewSection.hidden = true;
                    }
                    return;
                }
                generateData();
            });
        }

        window.generateData = generateData;
        window.downloadCsv = downloadCsv;
    });
})();

// ============================================================================
// SECTION 3: Home Page
// ============================================================================
// (Empty - no specific interaction needed)
