document.addEventListener('DOMContentLoaded', () => {
    // 1. Переключение вкладок
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Глобальное хранилище данных
    window.unitsData = []; 

    // Проверяем, есть ли сохраненные данные в localStorage
    const savedData = localStorage.getItem('gameBalanceData');
    if (savedData) {
        window.unitsData = JSON.parse(savedData);
        renderTable(window.unitsData);
        document.getElementById('importStatus').innerHTML = `<span style="color: green;">Данные восстановлены из памяти браузера.</span>`;
    }

    // 2. Модуль Импорта
    const fileInput = document.getElementById('fileInput');
    const importStatus = document.getElementById('importStatus');

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            try {
                let data = [];
                if (file.name.endsWith('.json')) {
                    data = JSON.parse(content);
                } else if (file.name.endsWith('.csv')) {
                    data = parseCSV(content);
                } else {
                    throw new Error("Неподдерживаемый формат файла. Нужен CSV или JSON.");
                }

                const validatedData = validateData(data);
                window.unitsData = validatedData;
                saveToLocalStorage(); // Сохраняем сразу после импорта
                
                importStatus.innerHTML = `<span style="color: green;">Файл успешно загружен! Строк: ${validatedData.length}</span>`;
                renderTable(validatedData);
                
            } catch (error) {
                importStatus.innerHTML = `<span style="color: red;">Ошибка: ${error.message}</span>`;
            }
        };
        reader.readAsText(file);
    });

    // 3. Модуль Редактора (Таблица)
    const addRowBtn = document.getElementById('addRowBtn');
    const saveDataBtn = document.getElementById('saveDataBtn');
    const saveStatus = document.getElementById('saveStatus');

    // Добавление новой строки
    addRowBtn.addEventListener('click', () => {
        // Создаем пустого юнита с уникальным ID
        const newId = window.unitsData.length > 0 ? Math.max(...window.unitsData.map(u => u.id)) + 1 : 1;
        window.unitsData.push({
            id: newId, name: "Новый юнит", hp: 100, attack: 10, defense: 5, cost: 100
        });
        renderTable(window.unitsData);
    });

    // Сохранение в localStorage
    function saveToLocalStorage() {
        localStorage.setItem('gameBalanceData', JSON.stringify(window.unitsData));
    }

    saveDataBtn.addEventListener('click', () => {
        saveToLocalStorage();
        saveStatus.textContent = "Сохранено!";
        setTimeout(() => { saveStatus.textContent = ""; }, 2000);
    });

    // Отрисовка таблицы (с возможностью редактирования)
    function renderTable(data) {
        const container = document.getElementById('tableContainer');
        if (data.length === 0) {
            container.innerHTML = '<p>Нет данных</p>';
            return;
        }

        let html = '<table><thead><tr>';
        const keys = Object.keys(data[0]);
        keys.forEach(key => { html += `<th>${key}</th>`; });
        html += '<th>Действие</th></tr></thead><tbody>';

        data.forEach((row, index) => {
            html += '<tr>';
            keys.forEach(key => {
                // Делаем все ячейки редактируемыми (contenteditable)
                html += `<td contenteditable="true" data-index="${index}" data-key="${key}" class="editable-cell">${row[key]}</td>`;
            });
            // Кнопка удаления
            html += `<td><button class="delete-btn" data-index="${index}" style="color: red; cursor: pointer;">Удалить</button></td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';

        container.innerHTML = html;

        // Обработчики изменения ячеек
        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('blur', (e) => {
                const index = e.target.getAttribute('data-index');
                const key = e.target.getAttribute('data-key');
                let newValue = e.target.textContent;

                // Если поле числовое, приводим к числу
                if (['id', 'hp', 'attack', 'defense', 'cost'].includes(key)) {
                    newValue = Number(newValue);
                    if (isNaN(newValue)) newValue = 0; // Защита от букв
                    e.target.textContent = newValue; // Возвращаем очищенное значение
                }

                window.unitsData[index][key] = newValue;
                saveToLocalStorage(); // Автосохранение при изменении
            });
        });

        // Обработчики удаления строк
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                window.unitsData.splice(index, 1); // Удаляем из массива
                renderTable(window.unitsData); // Перерисовываем
                saveToLocalStorage(); // Автосохранение
            });
        });
    }

        // 4. Модуль TTK (Калькулятор урона)
    const attackerSelect = document.getElementById('attackerSelect');
    const targetSelect = document.getElementById('targetSelect');
    const calcTtkBtn = document.getElementById('calcTtkBtn');
    const ttkResult = document.getElementById('ttkResult');

    // Обновление выпадающих списков при переходе на вкладку
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.getAttribute('data-tab') === 'ttk') {
                updateSelects();
            }
        });
    });

    function updateSelects() {
        // Очищаем списки
        attackerSelect.innerHTML = '';
        targetSelect.innerHTML = '';

        window.unitsData.forEach(unit => {
            const option1 = document.createElement('option');
            option1.value = unit.id;
            option1.textContent = unit.name;
            attackerSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = unit.id;
            option2.textContent = unit.name;
            targetSelect.appendChild(option2);
        });
    }

    // Логика расчета TTK
    calcTtkBtn.addEventListener('click', () => {
        const attackerId = Number(attackerSelect.value);
        const targetId = Number(targetSelect.value);

        const attacker = window.unitsData.find(u => u.id === attackerId);
        const target = window.unitsData.find(u => u.id === targetId);

        if (!attacker || !target) {
            ttkResult.innerHTML = "<span style='color: red;'>Выберите бойцов!</span>";
            return;
        }

        // Наша формула урона: (Атака - Защита)
        // Если защита больше атаки, наносится минимальный урон 1 (чтобы не было бесконечного боя)
        let damage = attacker.attack - target.defense;
        if (damage < 1) damage = 1;

        // Считаем, сколько ударов нужно, чтобы убить цель (округляем вверх)
        const hitsToKill = Math.ceil(target.hp / damage);
        
        // Предполагаем, что 1 удар наносится раз в 1 секунду (для простоты)
        // TTK = количество ударов * 1 сек.
        const ttkSeconds = hitsToKill; 

        ttkResult.innerHTML = `
            <p>Бой: <b>${attacker.name}</b> против <b>${target.name}</b></p>
            <p>Урон за удар: <b>${damage}</b> (Атака ${attacker.attack} - Защита ${target.defense})</p>
            <p>Ударов до убийства: <b>${hitsToKill}</b></p>
            <p style="color: #e74c3c; margin-top: 10px;">Время до убийства (TTK): <b>${ttkSeconds} сек.</b></p>
        `;
    });

        // 5. Модуль Прогрессии (График)
    const calcProgBtn = document.getElementById('calcProgBtn');
    let chartInstance = null; // Переменная для хранения графика, чтобы перерисовывать его

    // Функция отрисовки при переключении на вкладку, чтобы график не был пустым
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.getAttribute('data-tab') === 'progression') {
                calculateProgression();
            }
        });
    });

    calcProgBtn.addEventListener('click', calculateProgression);

    function calculateProgression() {
        const baseExp = Number(document.getElementById('baseExpInput').value);
        const multiplier = Number(document.getElementById('multiplierInput').value);
        const maxLevel = Number(document.getElementById('maxLevelInput').value);

        if (baseExp <= 0 || multiplier <= 0 || maxLevel <= 0) {
            alert("Введите положительные числа!");
            return;
        }

        const labels = [];
        const dataPoints = [];
        const tableElement = document.getElementById('progTable');

        let tableHTML = '<tr><th>Уровень</th><th>Нужно опыта</th></tr>';
        let totalExp = 0;

        for (let level = 1; level <= maxLevel; level++) {
            // Формула: Базовый опыт * (Множитель ^ (уровень - 1))
            // Например: 100 * (1.5 ^ 0) = 100, 100 * (1.5 ^ 1) = 150 и т.д.
            let expForLevel = Math.floor(baseExp * Math.pow(multiplier, level - 1));
            totalExp += expForLevel;

            labels.push('Ур. ' + level);
            dataPoints.push(expForLevel);

            tableHTML += `<tr><td>${level}</td><td>${expForLevel}</td></tr>`;
        }

        tableElement.innerHTML = tableHTML;

        // Отрисовка графика (удаляем старый, если он был)
        const ctx = document.getElementById('progChart').getContext('2d');
        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Опыт для достижения уровня',
                    data: dataPoints,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    fill: true,
                    tension: 0.3 // Делает линию плавной (изогнутой)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

        // 6. Модуль Лута (Проверка и экспорт)
    const addLootBtn = document.getElementById('addLootBtn');
    const checkLootBtn = document.getElementById('checkLootBtn');
    const exportLootBtn = document.getElementById('exportLootBtn');
    const lootTableBody = document.getElementById('lootTableBody');
    const lootStatus = document.getElementById('lootStatus');

    // Добавление новой строки в таблицу лута
    addLootBtn.addEventListener('click', () => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="loot-name" value="Новый предмет" style="width: 90%; padding: 5px;"></td>
            <td><input type="number" class="loot-chance" value="10" min="0" max="100" style="width: 80px; padding: 5px;"></td>
            <td><button class="delete-loot-btn" style="color: red; cursor: pointer;">Удалить</button></td>
        `;
        lootTableBody.appendChild(tr);

        // Обработчик удаления для новой строки
        tr.querySelector('.delete-loot-btn').addEventListener('click', () => {
            tr.remove();
        });
    });

    // Проверка суммы
    checkLootBtn.addEventListener('click', () => {
        const chanceInputs = document.querySelectorAll('.loot-chance');
        let total = 0;

        chanceInputs.forEach(input => {
            total += Number(input.value);
            // Подсвечиваем поле, если введено что-то не то
            if (Number(input.value) < 0 || Number(input.value) > 100) {
                input.style.borderColor = 'red';
            } else {
                input.style.borderColor = '#ccc';
            }
        });

        if (chanceInputs.length === 0) {
            lootStatus.innerHTML = "<span style='color: gray;'>Добавьте хотя бы один предмет.</span>";
            return;
        }

        if (total === 100) {
            lootStatus.innerHTML = "<span style='color: green;'>✅ Отлично! Сумма шансов ровно 100%.</span>";
        } else if (total > 100) {
            lootStatus.innerHTML = `<span style='color: red;'>❌ Ошибка! Сумма превышает 100% (сейчас ${total}%).</span>`;
        } else {
            lootStatus.innerHTML = `<span style='color: red;'>❌ Ошибка! Сумма меньше 100% (сейчас ${total}%).</span>`;
        }
    });

    // Экспорт в JSON
    exportLootBtn.addEventListener('click', () => {
        const rows = lootTableBody.querySelectorAll('tr');
        const lootData = [];

        rows.forEach(row => {
            const name = row.querySelector('.loot-name').value;
            const chance = Number(row.querySelector('.loot-chance').value);
            lootData.push({ item: name, chance: chance });
        });

        if (lootData.length === 0) {
            alert("Таблица лута пуста!");
            return;
        }

        // Скачивание файла
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lootData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "loot_table.json");
        document.body.appendChild(downloadAnchorNode); // для Firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // --- Вспомогательные функции (парсинг и валидация из прошлого шага) ---
    function parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) throw new Error("Файл пуст.");
        const headers = lines[0].split(',').map(h => h.trim());
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentLine = lines[i].split(',');
            if (currentLine.length !== headers.length) continue; 
            headers.forEach((header, index) => { obj[header] = currentLine[index].trim(); });
            result.push(obj);
        }
        return result;
    }

    function validateData(data) {
        if (!Array.isArray(data)) throw new Error("JSON должен быть массивом.");
        const requiredColumns = ['id', 'name', 'hp', 'attack', 'defense', 'cost'];
        if (data.length > 0 && !(requiredColumns.every(col => col in data[0]))) {
            throw new Error("Отсутствуют обязательные колонки.");
        }
        const seenIds = new Set();
        return data.map((item, index) => {
            if (seenIds.has(item.id)) throw new Error(`Дубликат ID: ${item.id}`);
            seenIds.add(item.id);
            const parsedItem = { ...item };
            ['id', 'hp', 'attack', 'defense', 'cost'].forEach(field => {
                const val = Number(parsedItem[field]);
                if (isNaN(val)) throw new Error(`Поле "${field}" не число.`);
                parsedItem[field] = val;
            });
            return parsedItem;
        });
    }
});