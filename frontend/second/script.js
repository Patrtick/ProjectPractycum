(function () {
    "use strict";

    var API_BASE = "http://localhost:8000";

    /** Имя файла шаблона в UI → template_id для API */
    var TEMPLATE_ID_BY_FILE = {
        "users.csv": "users",
        "orders.csv": "orders"
    };

    /** Поля чекбоксов: подпись в UI и ключ column для API */
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
        document.querySelectorAll(".tab").forEach(function (tab) {
            tab.addEventListener("click", function () {
                document.querySelectorAll(".tab").forEach(function (t) {
                    t.classList.remove("active");
                    t.setAttribute("aria-selected", "false");
                });
                tab.classList.add("active");
                tab.setAttribute("aria-selected", "true");
            });
        });

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
            return "Ошибка сервера (" + status + "). Попробуйте позже.";
        }

        function extractCsvFromResponse(response, bodyText, jsonData) {
            var ct = (response.headers.get("content-type") || "").toLowerCase();
            if (ct.indexOf("application/json") !== -1 && jsonData) {
                if (typeof jsonData.csv === "string") {
                    return jsonData.csv;
                }
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
                var res = await fetch(API_BASE + "/api/generate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json, text/csv, text/plain, */*"
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
                generateData();
            });
        }

        window.generateData = generateData;
        window.downloadCsv = downloadCsv;
    });
})();
