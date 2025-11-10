(() => {
    'use strict';

    const EMBED_SELECTOR = '[data-tests-creator-embed]';
    const FRAME_CLASS = 'tests-creator-extension-frame';
    const STYLE_ID = 'tests-creator-extension-style';
    const PANEL_URL = chrome.runtime.getURL('panel.html');

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .${FRAME_CLASS} {
                width: 100%;
                min-height: 640px;
                border: 1px solid #d0d5dd;
                border-radius: 12px;
                box-shadow: 0 12px 24px rgba(15, 23, 42, 0.15);
                background: #fff;
                margin: 16px 0;
            }
        `;
        document.head.appendChild(style);
    }

    function markInjected(node) {
        node.dataset.testsCreatorAttached = 'true';
    }

    function isInjected(node) {
        return node.dataset.testsCreatorAttached === 'true';
    }

    function injectInto(node) {
        if (!(node instanceof HTMLElement) || isInjected(node)) {
            return;
        }

        ensureStyles();

        const frame = document.createElement('iframe');
        frame.className = FRAME_CLASS;
        frame.src = PANEL_URL;
        frame.title = 'Конструктор тестов';
        frame.loading = 'lazy';
        frame.setAttribute('aria-label', 'Конструктор тестов расширения');

        node.appendChild(frame);
        markInjected(node);
    }

    function scanAndInject(root = document) {
        const targets = root.querySelectorAll(EMBED_SELECTOR);
        targets.forEach(injectInto);
    }

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) {
                    return;
                }
                if (node.matches && node.matches(EMBED_SELECTOR)) {
                    injectInto(node);
                }
                scanAndInject(node);
            });
        }
    });

    function start() {
        scanAndInject();
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
