(() => {
    const storageKey = 'testsCreatorState';
    let tests = [];
    let bulkTableData = [];
    let currentEditIndex = null;
    let problemStatementValue = '';
    let solutionCodeValue = '';
    let solverCache = { code: '', solver: null };

    const archiveNameInput = document.getElementById('archiveName');
    const defaultArchiveName = 'tests-archive';
    const downloadButton = document.getElementById('downloadArchive');
    const resetButton = document.getElementById('resetArchive');
    const testsList = document.getElementById('testsList');
    const testsCount = document.getElementById('testsCount');
    const statusBox = document.getElementById('status');

    const singleForm = document.getElementById('singleForm');
    const singleInput = document.getElementById('singleInput');
    const singleOutput = document.getElementById('singleOutput');
    const clearSingle = document.getElementById('clearSingle');

    const bulkForm = document.getElementById('bulkForm');
    const tablePasteArea = document.getElementById('tablePasteArea');
    const tablePreview = document.getElementById('tablePreview');
    const tableHint = document.getElementById('tableHint');
    const clearBulk = document.getElementById('clearBulk');

    const problemStatementInput = document.getElementById('problemStatement');
    const solutionCodeInput = document.getElementById('solutionCode');
    const generateSingleOutputButton = document.getElementById('generateSingleOutput');
    const generateBulkOutputsButton = document.getElementById('generateBulkOutputs');

    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editInput = document.getElementById('editInput');
    const editOutput = document.getElementById('editOutput');

    const textareaAutoResize = new WeakMap();

    const windows1251Specials = {
        0x0402: 0x80,
        0x0403: 0x81,
        0x201A: 0x82,
        0x0453: 0x83,
        0x201E: 0x84,
        0x2026: 0x85,
        0x2020: 0x86,
        0x2021: 0x87,
        0x20AC: 0x88,
        0x2030: 0x89,
        0x0409: 0x8A,
        0x2039: 0x8B,
        0x040A: 0x8C,
        0x040C: 0x8D,
        0x040B: 0x8E,
        0x040F: 0x8F,
        0x0452: 0x90,
        0x2018: 0x91,
        0x2019: 0x92,
        0x201C: 0x93,
        0x201D: 0x94,
        0x2022: 0x95,
        0x2013: 0x96,
        0x2014: 0x97,
        0x2122: 0x99,
        0x0459: 0x9A,
        0x203A: 0x9B,
        0x045A: 0x9C,
        0x045C: 0x9D,
        0x045B: 0x9E,
        0x045F: 0x9F,
        0x00A0: 0xA0,
        0x040E: 0xA1,
        0x045E: 0xA2,
        0x0408: 0xA3,
        0x00A4: 0xA4,
        0x0490: 0xA5,
        0x00A6: 0xA6,
        0x00A7: 0xA7,
        0x0401: 0xA8,
        0x00A9: 0xA9,
        0x0404: 0xAA,
        0x00AB: 0xAB,
        0x00AC: 0xAC,
        0x00AD: 0xAD,
        0x00AE: 0xAE,
        0x0407: 0xAF,
        0x00B0: 0xB0,
        0x00B1: 0xB1,
        0x0406: 0xB2,
        0x0456: 0xB3,
        0x0491: 0xB4,
        0x00B5: 0xB5,
        0x00B6: 0xB6,
        0x00B7: 0xB7,
        0x0451: 0xB8,
        0x2116: 0xB9,
        0x0454: 0xBA,
        0x00BB: 0xBB,
        0x0458: 0xBC,
        0x0405: 0xBD,
        0x0455: 0xBE,
        0x0457: 0xBF
    };

    const windows1251Encoder = (() => {
        let encodeMap = null;

        function createMap() {
            if (typeof TextDecoder === 'undefined') {
                return null;
            }
            try {
                const decoder = new TextDecoder('windows-1251', { fatal: false });
                const map = new Map();
                for (let byte = 0; byte <= 0xff; byte += 1) {
                    const decoded = decoder.decode(new Uint8Array([byte]));
                    if (decoded) {
                        map.set(decoded.codePointAt(0), byte);
                    }
                }
                return map;
            } catch (error) {
                console.warn('Не удалось инициализировать кодировщик Windows-1251, используется запасная схема.', error);
                return null;
            }
        }

        function encodeCodePoint(codePoint) {
            if (encodeMap && encodeMap.has(codePoint)) {
                return encodeMap.get(codePoint);
            }
            if (codePoint <= 0x7f) {
                return codePoint;
            }
            if (codePoint >= 0x0410 && codePoint <= 0x044f) {
                return 0xc0 + (codePoint - 0x0410);
            }
            if (windows1251Specials[codePoint] !== undefined) {
                return windows1251Specials[codePoint];
            }
            return undefined;
        }

        return {
            encode(value) {
                const text = value === undefined || value === null ? '' : String(value);
                if (!encodeMap) {
                    encodeMap = createMap();
                }
                const bytes = [];
                for (const symbol of text) {
                    const codePoint = symbol.codePointAt(0);
                    const encoded = encodeCodePoint(codePoint);
                    if (encoded !== undefined) {
                        bytes.push(encoded);
                    } else {
                        console.warn('Символ не может быть закодирован в Windows-1251, используется знак вопроса.', symbol, codePoint);
                        bytes.push(0x3f);
                    }
                }
                return new Uint8Array(bytes);
            }
        };
    })();

    function encodeWindows1251(value) {
        return windows1251Encoder.encode(value);
    }

    function toNumeric(value) {
        const number = parseFloat(value);
        return Number.isNaN(number) ? 0 : number;
    }

    function computeTextareaMinHeight(textarea) {
        const style = window.getComputedStyle(textarea);
        const lineHeightValue = parseFloat(style.lineHeight);
        const fontSizeValue = parseFloat(style.fontSize);
        const lineHeight = Number.isNaN(lineHeightValue)
            ? (Number.isNaN(fontSizeValue) ? 16 : fontSizeValue * 1.2)
            : lineHeightValue;
        const padding = toNumeric(style.paddingTop) + toNumeric(style.paddingBottom);
        const border = toNumeric(style.borderTopWidth) + toNumeric(style.borderBottomWidth);
        return Math.max(1, Math.ceil(lineHeight + padding + border));
    }

    function ensureTextareaAutoResize(textarea) {
        if (!textarea || textareaAutoResize.has(textarea)) {
            return;
        }
        const data = {
            minHeight: computeTextareaMinHeight(textarea),
            update: null
        };
        textarea.style.minHeight = `${data.minHeight}px`;
        textarea.style.overflowY = 'hidden';
        data.update = () => {
            textarea.style.height = 'auto';
            const nextHeight = Math.max(data.minHeight, textarea.scrollHeight);
            textarea.style.height = `${nextHeight}px`;
        };
        textarea.addEventListener('input', data.update);
        textareaAutoResize.set(textarea, data);
        data.update();
    }

    function updateTextareaAutoHeight(textarea) {
        if (!textarea) {
            return;
        }
        if (!textareaAutoResize.has(textarea)) {
            ensureTextareaAutoResize(textarea);
        }
        const data = textareaAutoResize.get(textarea);
        if (!data) {
            return;
        }
        const recalculatedMin = computeTextareaMinHeight(textarea);
        if (recalculatedMin !== data.minHeight) {
            data.minHeight = recalculatedMin;
            textarea.style.minHeight = `${data.minHeight}px`;
        }
        data.update();
    }

    function initializeTextareaAutoResize() {
        const elements = Array.from(document.querySelectorAll('textarea'));
        elements.forEach(ensureTextareaAutoResize);
        return elements;
    }

    function assignTextareaValue(textarea, value) {
        if (!textarea) {
            return;
        }
        textarea.value = value;
        updateTextareaAutoHeight(textarea);
    }

    function setStatus(message, type = 'info') {
        statusBox.textContent = message;
        statusBox.className = '';
        if (message) {
            statusBox.classList.add(type);
        }
    }

    function getSolutionCodeSource() {
        if (solutionCodeInput) {
            return solutionCodeInput.value;
        }
        return solutionCodeValue;
    }

    function invalidateSolverCache() {
        solverCache = { code: '', solver: null };
    }

    function normalizeSolverOutput(value) {
        if (value === undefined || value === null) {
            return '';
        }
        if (Array.isArray(value)) {
            return value.join('\n');
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch (error) {
                return String(value);
            }
        }
        return String(value);
    }

    function formatSolverError(error) {
        if (error instanceof Error && error.message) {
            return error.message;
        }
        return String(error);
    }

    async function executeSolverOnInput(solver, inputText) {
        let result = solver(inputText);
        if (result && typeof result.then === 'function') {
            result = await result;
        }
        return normalizeSolverOutput(result);
    }

    function getSolver() {
        const source = (getSolutionCodeSource() || '').trim();
        if (!source) {
            throw new Error('Добавьте решение выше, чтобы использовать автогенерацию.');
        }
        if (solverCache.solver && solverCache.code === source) {
            return solverCache.solver;
        }
        try {
            const factory = new Function(`${source}; if (typeof solve !== 'function') { throw new Error('Определите функцию solve(input).'); } return solve;`);
            const solver = factory();
            if (typeof solver !== 'function') {
                throw new Error('Функция solve(input) не найдена.');
            }
            solverCache = { code: source, solver };
            return solver;
        } catch (error) {
            invalidateSolverCache();
            throw error instanceof Error ? error : new Error(String(error));
        }
    }

    async function fillSingleOutputFromSolution() {
        try {
            const solver = getSolver();
            const outputValue = await executeSolverOnInput(solver, singleInput.value);
            assignTextareaValue(singleOutput, outputValue);
            setStatus('Выходные данные получены из решения.', 'success');
        } catch (error) {
            console.error('Ошибка выполнения решения', error);
            setStatus(`Не удалось выполнить решение: ${formatSolverError(error)}`, 'error');
        }
    }

    async function fillBulkOutputsFromSolution() {
        if (!bulkTableData.length) {
            setStatus('Сначала вставьте таблицу с данными перед автозаполнением.', 'error');
            if (tablePasteArea) {
                tablePasteArea.focus();
            }
            return;
        }

        try {
            const solver = getSolver();
            const computedOutputs = [];
            let processed = 0;

            for (let index = 0; index < bulkTableData.length; index += 1) {
                const inputValue = bulkTableData[index]?.input ?? '';
                if (inputValue === '') {
                    computedOutputs[index] = null;
                    continue;
                }
                const outputValue = await executeSolverOnInput(solver, inputValue);
                computedOutputs[index] = outputValue;
                processed += 1;
            }

            if (!processed) {
                setStatus('Нет строк с входными данными для автозаполнения.', 'error');
                return;
            }

            computedOutputs.forEach((value, index) => {
                if (!bulkTableData[index]) {
                    return;
                }
                if (value !== null && value !== undefined) {
                    bulkTableData[index].output = value;
                }
            });

            renderBulkTable();
            saveState();
            setStatus(`Выходы заполнены для ${processed} ${declineTests(processed)}.`, 'success');
        } catch (error) {
            console.error('Ошибка выполнения решения', error);
            setStatus(`Не удалось выполнить решение: ${formatSolverError(error)}`, 'error');
        }
    }

    function getArchiveName() {
        return (archiveNameInput.value || '').trim() || defaultArchiveName;
    }

    function saveState() {
        const state = {
            tests,
            archiveName: archiveNameInput.value
        };

        if (tablePasteArea) {
            state.bulkTableData = bulkTableData.map(item => ({
                input: typeof item.input === 'string' ? item.input : '',
                output: typeof item.output === 'string' ? item.output : ''
            }));
        }

        if (problemStatementInput) {
            problemStatementValue = problemStatementInput.value;
        }
        state.problemStatement = problemStatementValue;

        if (solutionCodeInput) {
            solutionCodeValue = solutionCodeInput.value;
        }
        state.solutionCode = solutionCodeValue;

        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (error) {
            console.error('Не удалось сохранить состояние', error);
        }
    }

    function loadState() {
        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) {
                return;
            }
            const state = JSON.parse(stored);
            if (Array.isArray(state.tests)) {
                tests = state.tests.map(item => ({
                    input: typeof item.input === 'string' ? item.input : '',
                    output: typeof item.output === 'string' ? item.output : ''
                }));
            }
            if (Array.isArray(state.bulkTableData)) {
                bulkTableData = state.bulkTableData
                    .map(item => ({
                        input: typeof item.input === 'string' ? item.input : '',
                        output: typeof item.output === 'string' ? item.output : ''
                    }));
            }
            if (typeof state.archiveName === 'string' && state.archiveName.trim()) {
                archiveNameInput.value = state.archiveName;
            } else {
                archiveNameInput.value = defaultArchiveName;
            }
            if (typeof state.problemStatement === 'string') {
                problemStatementValue = state.problemStatement;
                assignTextareaValue(problemStatementInput, problemStatementValue);
            } else {
                problemStatementValue = '';
            }
            if (typeof state.solutionCode === 'string') {
                solutionCodeValue = state.solutionCode;
                assignTextareaValue(solutionCodeInput, solutionCodeValue);
            } else {
                solutionCodeValue = '';
            }
        } catch (error) {
            console.error('Не удалось загрузить сохранённое состояние', error);
        }
    }

    function renderTests() {
        testsList.innerHTML = '';
        if (!tests.length) {
            testsList.classList.add('empty-state');
            testsList.innerHTML = '<p>Пока нет добавленных тестов. Используйте формы выше, чтобы создать пары входных и выходных данных.</p>';
            testsCount.textContent = '0 тестов';
            downloadButton.disabled = true;
            return;
        }

        testsList.classList.remove('empty-state');
        downloadButton.disabled = false;
        testsCount.textContent = `${tests.length} ${declineTests(tests.length)}`;

        tests.forEach((test, index) => {
            const item = document.createElement('article');
            item.className = 'test-item';

            const header = document.createElement('div');
            header.className = 'test-header';

            const title = document.createElement('h3');
            title.textContent = `Тест #${index + 1}`;
            header.appendChild(title);

            const actions = document.createElement('div');
            actions.className = 'test-actions';

            actions.appendChild(createActionButton('Редактировать', () => openEditModal(index)));
            actions.appendChild(createActionButton('Вверх', () => moveTest(index, -1), index === 0));
            actions.appendChild(createActionButton('Вниз', () => moveTest(index, 1), index === tests.length - 1));
            actions.appendChild(createActionButton('Удалить', () => deleteTest(index)));

            header.appendChild(actions);

            const content = document.createElement('div');
            content.className = 'test-content';

            content.appendChild(createTestBlock('Входные данные', test.input));
            content.appendChild(createTestBlock('Выходные данные', test.output));

            item.appendChild(header);
            item.appendChild(content);
            testsList.appendChild(item);
        });
    }

    function declineTests(count) {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) {
            return 'тест';
        }
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
            return 'теста';
        }
        return 'тестов';
    }

    function createActionButton(label, handler, disabled = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary';
        button.textContent = label;
        button.disabled = disabled;
        button.addEventListener('click', handler);
        return button;
    }

    function createTestBlock(title, content) {
        const block = document.createElement('div');
        block.className = 'test-block';

        const heading = document.createElement('h4');
        heading.textContent = title;
        block.appendChild(heading);

        const pre = document.createElement('pre');
        pre.textContent = content === '' ? '∅ (пустая строка)' : content;
        block.appendChild(pre);
        return block;
    }

    function addTest(input, output) {
        tests.push({ input, output });
        saveState();
        renderTests();
    }

    function moveTest(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= tests.length) {
            return;
        }
        const [moved] = tests.splice(index, 1);
        tests.splice(newIndex, 0, moved);
        saveState();
        renderTests();
    }

    function deleteTest(index) {
        tests.splice(index, 1);
        saveState();
        renderTests();
        setStatus('Тест удалён.', 'info');
    }

    function openEditModal(index) {
        currentEditIndex = index;
        assignTextareaValue(editInput, tests[index].input);
        assignTextareaValue(editOutput, tests[index].output);
        editModal.classList.add('active');
        editModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        editInput.focus();
    }

    function closeEditModal() {
        editModal.classList.remove('active');
        editModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        currentEditIndex = null;
    }

    function detectDelimiter(text) {
        if (text.includes('\t')) {
            return '\t';
        }
        if (text.includes(';')) {
            return ';';
        }
        if (text.includes(',')) {
            return ',';
        }
        return '\t';
    }

    function parseDelimitedRows(text, delimiter) {
        const rows = [];
        let row = [];
        let field = '';
        let insideQuotes = false;

        for (let index = 0; index < text.length; index += 1) {
            const char = text[index];
            if (char === '"') {
                if (insideQuotes) {
                    if (text[index + 1] === '"') {
                        field += '"';
                        index += 1;
                    } else {
                        insideQuotes = false;
                    }
                    continue;
                }

                if (field === '') {
                    insideQuotes = true;
                    continue;
                }
            }

            if (!insideQuotes && char === delimiter) {
                row.push(field);
                field = '';
                continue;
            }

            if (!insideQuotes && char === '\n') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
                continue;
            }

            field += char;
        }

        if (insideQuotes) {
            throw new Error('Обнаружены незакрытые кавычки в табличных данных.');
        }

        row.push(field);
        rows.push(row);

        return rows;
    }

    function parseBulkInput(rawText) {
        if (!rawText) {
            return [];
        }

        const normalizedText = rawText.replace(/\r\n?/g, '\n');
        const delimiter = detectDelimiter(normalizedText);
        const rows = parseDelimitedRows(normalizedText, delimiter);

        if (!rows.length) {
            return [];
        }

        const parsed = rows.map((row, rowIndex) => {
            if (row.length < 2) {
                throw new Error(`Строка ${rowIndex + 1} не содержит двух столбцов.`);
            }
            return {
                input: row[0],
                output: row.slice(1).join('\t')
            };
        });

        return normalizeBulkRows(parsed);
    }

    function parseTableFromHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const table = doc.querySelector('table');
        if (!table) {
            return null;
        }
        const rows = Array.from(table.querySelectorAll('tr'));
        if (!rows.length) {
            return [];
        }
        const parsed = rows
            .map((row, index) => {
                const cells = Array.from(row.querySelectorAll('th, td')).map(cell =>
                    cell.textContent.replace(/\r\n?/g, '\n')
                );
                if (!cells.length) {
                    return null;
                }
                if (cells.length < 2) {
                    throw new Error(`Строка ${index + 1} таблицы содержит меньше двух столбцов.`);
                }
                return {
                    input: cells[0],
                    output: cells.slice(1).join('\t')
                };
            })
            .filter(Boolean);
        return normalizeBulkRows(parsed);
    }

    function normalizeBulkRows(rows) {
        if (!Array.isArray(rows)) {
            return [];
        }
        const normalized = rows.map(item => ({
            input: typeof item.input === 'string' ? item.input : '',
            output: typeof item.output === 'string' ? item.output : ''
        }));
        if (!normalized.length) {
            return [];
        }
        const headerIndex = normalized.findIndex(row =>
            (row.input.trim() !== '' || row.output.trim() !== '')
        );
        if (headerIndex !== -1 && isHeaderRow(normalized[headerIndex])) {
            return normalized.filter((_, index) => index !== headerIndex);
        }
        return normalized;
    }

    function isHeaderRow(row) {
        if (!row) {
            return false;
        }
        const inputValue = row.input.trim().toLowerCase();
        const outputValue = row.output.trim().toLowerCase();
        const inputKeywords = ['вход', 'input', 'пример', 'данные'];
        const outputKeywords = ['выход', 'output', 'ответ', 'result'];
        const hasInputKeyword = inputKeywords.some(keyword => inputValue.includes(keyword));
        const hasOutputKeyword = outputKeywords.some(keyword => outputValue.includes(keyword));
        return hasInputKeyword && hasOutputKeyword;
    }

    function getNonEmptyRows(rows) {
        if (!Array.isArray(rows)) {
            return [];
        }
        return rows.filter(row => (row.input ?? '') !== '' || (row.output ?? '') !== '');
    }

    function updateTableHint() {
        if (!tableHint) {
            return;
        }
        if (bulkTableData.length) {
            tableHint.textContent = `Строк в таблице: ${bulkTableData.length}. Отредактируйте значения при необходимости перед добавлением.`;
        } else {
            tableHint.textContent = 'Нажмите сюда и вставьте (Ctrl+V) таблицу из Excel или Google Sheets. Будут использованы первые два столбца.';
        }
    }

    function renderBulkTable() {
        if (!tablePreview) {
            return;
        }
        tablePreview.innerHTML = '';
        if (!bulkTableData.length) {
            if (tablePasteArea) {
                tablePasteArea.classList.remove('has-table');
            }
            const placeholder = document.createElement('p');
            placeholder.className = 'table-placeholder';
            placeholder.textContent = 'Здесь появится таблица после вставки данных.';
            tablePreview.appendChild(placeholder);
            if (clearBulk) {
                clearBulk.disabled = true;
            }
            updateTableHint();
            return;
        }

        if (tablePasteArea) {
            tablePasteArea.classList.add('has-table');
        }

        const table = document.createElement('table');
        table.className = 'pasted-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Входные данные', 'Выходные данные', ''].forEach(text => {
            const cell = document.createElement('th');
            cell.textContent = text;
            headerRow.appendChild(cell);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        bulkTableData.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            ['input', 'output'].forEach(field => {
                const td = document.createElement('td');
                td.contentEditable = 'true';
                td.dataset.rowIndex = String(rowIndex);
                td.dataset.field = field;
                td.spellcheck = false;
                td.textContent = row[field];
                td.addEventListener('input', handleBulkCellInput);
                tr.appendChild(td);
            });

            const removeCell = document.createElement('td');
            removeCell.className = 'remove-cell';
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'icon-button';
            removeButton.setAttribute('aria-label', `Удалить строку ${rowIndex + 1}`);
            removeButton.textContent = '×';
            removeButton.addEventListener('click', () => removeBulkRow(rowIndex));
            removeCell.appendChild(removeButton);
            tr.appendChild(removeCell);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tablePreview.appendChild(table);

        if (clearBulk) {
            clearBulk.disabled = false;
        }

        updateTableHint();
    }

    function handleBulkCellInput(event) {
        const cell = event.currentTarget;
        const rowIndex = Number(cell.dataset.rowIndex);
        const field = cell.dataset.field;
        if (!Number.isInteger(rowIndex) || !['input', 'output'].includes(field)) {
            return;
        }
        if (!bulkTableData[rowIndex]) {
            return;
        }
        bulkTableData[rowIndex][field] = cell.textContent;
        saveState();
    }

    function removeBulkRow(index) {
        if (index < 0 || index >= bulkTableData.length) {
            return;
        }
        bulkTableData.splice(index, 1);
        renderBulkTable();
        saveState();
        setStatus('Строка удалена из таблицы.', 'info');
    }

    function handleBulkPaste(event) {
        if (!event.clipboardData) {
            return;
        }
        event.preventDefault();

        let parsed = null;
        const html = event.clipboardData.getData('text/html');
        const text = event.clipboardData.getData('text/plain');

        try {
            if (html) {
                parsed = parseTableFromHTML(html);
            }
            if ((!parsed || !parsed.length) && text) {
                parsed = parseBulkInput(text);
            }
        } catch (error) {
            console.error('Ошибка обработки табличных данных', error);
            setStatus(error.message || 'Не удалось распознать таблицу.', 'error');
            return;
        }

        if (!parsed || !parsed.length) {
            setStatus('Не удалось распознать таблицу. Убедитесь, что копируете минимум два столбца.', 'error');
            return;
        }

        bulkTableData = parsed;
        renderBulkTable();
        saveState();
        setStatus(`Таблица загружена: ${bulkTableData.length} ${declineTests(bulkTableData.length)}.`, 'success');
    }

    function generateFileName(base) {
        const sanitized = base.trim().replace(/\s+/g, '_') || 'tests';
        const now = new Date();
        const pad = number => String(number).padStart(2, '0');
        const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        return `${sanitized}_${timestamp}.zip`;
    }

    async function downloadArchive() {
        if (!tests.length) {
            setStatus('Добавьте хотя бы один тест перед выгрузкой архива.', 'error');
            return;
        }

        const zip = new JSZip();
        tests.forEach((test, index) => {
            const baseName = String(index + 1);
            zip.file(baseName, encodeWindows1251(test.input), { binary: true });
            zip.file(`${baseName}.a`, encodeWindows1251(test.output), { binary: true });
        });

        try {
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = generateFileName(getArchiveName());
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setStatus('Архив успешно сформирован и скачан.', 'success');
        } catch (error) {
            console.error(error);
            setStatus('Не удалось сформировать архив. Попробуйте снова.', 'error');
        }
    }

    function resetArchive() {
        const hasProblemStatement = problemStatementInput && problemStatementInput.value;
        const hasSolutionCode = solutionCodeInput && solutionCodeInput.value;
        const archiveName = (archiveNameInput.value || '').trim();
        const hasCustomArchiveName = archiveName && archiveName !== defaultArchiveName;
        if (!tests.length && !hasCustomArchiveName && !bulkTableData.length && !hasProblemStatement && !hasSolutionCode) {
            return;
        }
        const confirmed = confirm('Очистить текущий архив и начать заново? Все несохранённые данные будут удалены.');
        if (!confirmed) {
            return;
        }
        tests = [];
        archiveNameInput.value = defaultArchiveName;
        bulkTableData = [];
        if (problemStatementInput) {
            assignTextareaValue(problemStatementInput, '');
        }
        if (solutionCodeInput) {
            assignTextareaValue(solutionCodeInput, '');
        }
        problemStatementValue = '';
        solutionCodeValue = '';
        invalidateSolverCache();
        renderBulkTable();
        saveState();
        renderTests();
        setStatus('Начните добавлять тесты заново.', 'info');
    }

    function handleTabClick(event) {
        const target = event.currentTarget;
        const tabName = target.dataset.tab;
        tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
        tabContents.forEach(content => {
            content.classList.toggle('hidden', content.dataset.tabContent !== tabName);
        });
    }

    function initTabs() {
        tabs.forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });
    }

    function attachEventListeners() {
        singleForm.addEventListener('submit', event => {
            event.preventDefault();
            const input = singleInput.value;
            const output = singleOutput.value;
            if (!input && !output) {
                setStatus('Введите данные хотя бы в одно из полей.', 'error');
                return;
            }
            addTest(input, output);
            assignTextareaValue(singleInput, '');
            assignTextareaValue(singleOutput, '');
            setStatus('Тест добавлен.', 'success');
        });

        clearSingle.addEventListener('click', () => {
            assignTextareaValue(singleInput, '');
            assignTextareaValue(singleOutput, '');
            setStatus('Поля очищены.', 'info');
        });

        if (generateSingleOutputButton) {
            generateSingleOutputButton.addEventListener('click', async () => {
                if (generateSingleOutputButton.disabled) {
                    return;
                }
                generateSingleOutputButton.disabled = true;
                try {
                    await fillSingleOutputFromSolution();
                } finally {
                    generateSingleOutputButton.disabled = false;
                }
            });
        }

        if (tablePasteArea) {
            tablePasteArea.addEventListener('paste', handleBulkPaste);
            tablePasteArea.addEventListener('focus', () => {
                tablePasteArea.classList.add('focused');
            });
            tablePasteArea.addEventListener('blur', () => {
                tablePasteArea.classList.remove('focused');
            });
            tablePasteArea.addEventListener('click', () => {
                tablePasteArea.focus();
            });
        }

        bulkForm.addEventListener('submit', event => {
            event.preventDefault();
            const prepared = getNonEmptyRows(bulkTableData);
            if (!prepared.length) {
                setStatus('Сначала вставьте таблицу с данными перед добавлением.', 'error');
                if (tablePasteArea) {
                    tablePasteArea.focus();
                }
                return;
            }
            prepared.forEach(item => {
                tests.push({
                    input: item.input,
                    output: item.output
                });
            });
            bulkTableData = [];
            renderBulkTable();
            saveState();
            renderTests();
            setStatus(`Добавлено ${prepared.length} ${declineTests(prepared.length)}.`, 'success');
        });

        clearBulk.addEventListener('click', () => {
            if (!bulkTableData.length) {
                return;
            }
            bulkTableData = [];
            renderBulkTable();
            saveState();
            setStatus('Таблица очищена.', 'info');
            if (tablePasteArea) {
                tablePasteArea.focus();
            }
        });

        if (generateBulkOutputsButton) {
            generateBulkOutputsButton.addEventListener('click', async () => {
                if (generateBulkOutputsButton.disabled) {
                    return;
                }
                generateBulkOutputsButton.disabled = true;
                try {
                    await fillBulkOutputsFromSolution();
                } finally {
                    generateBulkOutputsButton.disabled = false;
                }
            });
        }

        downloadButton.addEventListener('click', downloadArchive);
        resetButton.addEventListener('click', resetArchive);

        archiveNameInput.addEventListener('input', () => {
            saveState();
        });

        if (problemStatementInput) {
            problemStatementInput.addEventListener('input', () => {
                saveState();
            });
        }

        if (solutionCodeInput) {
            solutionCodeInput.addEventListener('input', () => {
                invalidateSolverCache();
                saveState();
            });
        }

        editForm.addEventListener('submit', event => {
            event.preventDefault();
            if (currentEditIndex === null) {
                return;
            }
            tests[currentEditIndex] = {
                input: editInput.value,
                output: editOutput.value
            };
            saveState();
            renderTests();
            closeEditModal();
            setStatus('Изменения сохранены.', 'success');
        });

        editModal.querySelectorAll('[data-close]').forEach(element => {
            element.addEventListener('click', () => {
                closeEditModal();
            });
        });

        editModal.addEventListener('click', event => {
            if (event.target.dataset.close !== undefined) {
                return;
            }
            if (event.target === editModal) {
                closeEditModal();
            }
        });

        window.addEventListener('keydown', event => {
            if (event.key === 'Escape' && editModal.classList.contains('active')) {
                closeEditModal();
            }
        });
    }

    function init() {
        const textareas = initializeTextareaAutoResize();
        loadState();
        if (!archiveNameInput.value) {
            archiveNameInput.value = defaultArchiveName;
        }
        renderTests();
        renderBulkTable();
        initTabs();
        attachEventListeners();
        textareas.forEach(updateTextareaAutoHeight);
        window.addEventListener('resize', () => {
            textareas.forEach(updateTextareaAutoHeight);
        });
        if (document.fonts && typeof document.fonts.addEventListener === 'function') {
            document.fonts.addEventListener('loadingdone', () => {
                textareas.forEach(updateTextareaAutoHeight);
            });
        }
    }

    init();
})();
