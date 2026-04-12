document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    var API_BASE = "http://localhost:8000";
    var API_ANALYZE = "/api/analyze";
    var API_ANONYM = "/api/anonymize";
    var API_METHODS = "/api/anonymize/methods";

    // DOM элементы
    var input = document.getElementById("csv-file-input");
    var btnPick = document.getElementById("btn-pick-file");
    var uploadFeedback = document.getElementById("upload-feedback");
    var previewSection = document.getElementById("preview-section");
    var previewThead = document.getElementById("preview-thead");
    var previewTbody = document.getElementById("preview-tbody");
    var configSection = document.getElementById("anonym-config-section");
    var configTbody = document.getElementById("config-tbody");
    var btnReset = document.getElementById("btn-reset-config");
    var btnAnonymize = document.getElementById("btn-anonymize");
    var actionsFeedback = document.getElementById("actions-feedback");
    var btnDownload = document.querySelector(".btn-download-final");

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
        if (btnDownload) btnDownload.classList.remove("show");
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
        bird.src = "pictures/bird.svg";
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
                renderPreview(header, preview.slice(0, 4));
                buildConfigRows(header);
                if (previewSection) previewSection.hidden = false;
                if (configSection) configSection.hidden = false;
                setUploadFeedback(file.name, false);
                currentFile = file;
                currentFileName = file.name;
                // Сбрасываем окно обратной связи при новой загрузке
                hideActionsFeedback();
                if (btnDownload) btnDownload.classList.remove("show");
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

        // Собираем правила
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

        // Показываем загрузку
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
                setActionsFeedback("Анонимизация выполнена успешно! Файл готов к скачиванию.", "success");
                if (btnDownload) btnDownload.classList.add("show");
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

    // Закрытие дропдаунов при клике вне
    document.addEventListener("click", closeAllDropdowns);

    // Изначально скрываем кнопку скачивания и окно обратной связи
    if (btnDownload) btnDownload.classList.remove("show");
    hideActionsFeedback();
});