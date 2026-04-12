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
                closeDropdown(root);
                updateCheckboxes(val);
            });
        });
    });

    function updateCheckboxes(template) {
        const checkboxesDiv = document.getElementById('checkboxes');
        checkboxesDiv.innerHTML = ''; // Очистить предыдущие
        if (template === 'users.csv') {
            const fields = ['ФИО/имя', 'email', 'телефон', 'город', 'дата регистрации'];
            fields.forEach(field => {
                const item = document.createElement('div');
                item.className = 'checkbox-item';
                item.innerHTML = `
                    <input type="checkbox" id="${field.replace(/\s+/g, '_')}" name="fields" value="${field}" checked>
                    <label for="${field.replace(/\s+/g, '_')}">${field}</label>
                `;
                checkboxesDiv.appendChild(item);
            });
            checkboxesDiv.hidden = false;
        } else if (template === 'orders.csv') {
            const fields = ['id заказа', 'id пользователя', 'дата', 'сумма', 'статус'];
            fields.forEach(field => {
                const item = document.createElement('div');
                item.className = 'checkbox-item';
                item.innerHTML = `
                    <input type="checkbox" id="${field.replace(/\s+/g, '_')}" name="fields" value="${field}" checked>
                    <label for="${field.replace(/\s+/g, '_')}">${field}</label>
                `;
                checkboxesDiv.appendChild(item);
            });
            checkboxesDiv.hidden = false;
        } else {
            checkboxesDiv.hidden = true;
        }
    }

    document.addEventListener("click", function () {
        closeAllDropdowns();
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeAllDropdowns();
        }
    });

    // Валидация поля ввода количества записей
    const recordsInput = document.querySelector('input[name="records"]');
    if (recordsInput) {
        function validateRecords() {
            const value = recordsInput.value.trim();
            const num = parseInt(value, 10);
            if (value !== '' && (isNaN(num) || num < 1 || num > 10000)) {
                recordsInput.classList.add('field-input--error');
            } else {
                recordsInput.classList.remove('field-input--error');
            }
        }
        recordsInput.addEventListener('input', validateRecords);
        recordsInput.addEventListener('blur', validateRecords);

        // Предотвращение ввода нецифровых символов
        recordsInput.addEventListener('keydown', function(e) {
            // Разрешить цифры, backspace, delete, tab, escape, enter, стрелки
            if (
                (e.key >= '0' && e.key <= '9') ||
                e.key === 'Backspace' ||
                e.key === 'Delete' ||
                e.key === 'Tab' ||
                e.key === 'Escape' ||
                e.key === 'Enter' ||
                (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')
            ) {
                return;
            }
            e.preventDefault();
        });
    }

    // Обработка кнопки Сгенерировать
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            // Валидация dropdown
            const hiddenInput = document.querySelector('input[name="template"]');
            const customSelect = document.querySelector('[data-dropdown]');
            if (hiddenInput && hiddenInput.value === '') {
                customSelect.classList.add('custom-select--error');
            } else {
                customSelect.classList.remove('custom-select--error');
            }

            // Валидация input
            validateRecords();
        });
    }
});
