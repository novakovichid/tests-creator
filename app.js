(() => {
    const storageKey = 'testsCreatorState';
    let tests = [];
    let currentEditIndex = null;

    const archiveNameInput = document.getElementById('archiveName');
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
    const bulkInput = document.getElementById('bulkInput');
    const clearBulk = document.getElementById('clearBulk');

    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editInput = document.getElementById('editInput');
    const editOutput = document.getElementById('editOutput');

    function setStatus(message, type = 'info') {
        statusBox.textContent = message;
        statusBox.className = '';
        if (message) {
            statusBox.classList.add(type);
        }
    }

    function saveState() {
        const state = {
            tests,
            archiveName: archiveNameInput.value
        };
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
            if (typeof state.archiveName === 'string') {
                archiveNameInput.value = state.archiveName;
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
        editInput.value = tests[index].input;
        editOutput.value = tests[index].output;
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

    function parseBulkInput(rawText) {
        const rows = rawText.split(/\n/).map(line => line.replace(/\r$/, '')).filter(line => line.length > 0);
        const parsed = [];
        rows.forEach((row, index) => {
            let parts;
            if (row.includes('\t')) {
                parts = row.split('\t');
            } else if (row.includes(';')) {
                parts = row.split(';');
            } else if (row.includes(',')) {
                parts = row.split(',');
            } else {
                parts = [row];
            }
            if (parts.length < 2) {
                throw new Error(`Строка ${index + 1} не содержит двух столбцов.`);
            }
            const input = parts[0];
            const output = parts.slice(1).join('\t');
            parsed.push({ input, output });
        });
        return parsed;
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
            zip.file(baseName, test.input);
            zip.file(`${baseName}.a`, test.output);
        });

        try {
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = generateFileName(archiveNameInput.value || 'tests');
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
        if (!tests.length && !archiveNameInput.value) {
            return;
        }
        const confirmed = confirm('Очистить текущий архив и начать заново? Все несохранённые данные будут удалены.');
        if (!confirmed) {
            return;
        }
        tests = [];
        archiveNameInput.value = '';
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
            singleInput.value = '';
            singleOutput.value = '';
            setStatus('Тест добавлен.', 'success');
        });

        clearSingle.addEventListener('click', () => {
            singleInput.value = '';
            singleOutput.value = '';
            setStatus('Поля очищены.', 'info');
        });

        bulkForm.addEventListener('submit', event => {
            event.preventDefault();
            const rawText = bulkInput.value;
            if (!rawText.trim()) {
                setStatus('Вставьте таблицу с данными перед добавлением.', 'error');
                return;
            }
            try {
                const parsed = parseBulkInput(rawText);
                parsed.forEach(item => tests.push(item));
                saveState();
                renderTests();
                setStatus(`Добавлено ${parsed.length} ${declineTests(parsed.length)}.`, 'success');
                bulkInput.value = '';
            } catch (error) {
                setStatus(error.message, 'error');
            }
        });

        clearBulk.addEventListener('click', () => {
            bulkInput.value = '';
            setStatus('Поле очищено.', 'info');
        });

        downloadButton.addEventListener('click', downloadArchive);
        resetButton.addEventListener('click', resetArchive);

        archiveNameInput.addEventListener('input', () => {
            saveState();
        });

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
        loadState();
        renderTests();
        initTabs();
        attachEventListeners();
    }

    init();
})();
