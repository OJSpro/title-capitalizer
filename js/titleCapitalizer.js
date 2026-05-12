/**
 * Title Capitalizer for OJS/OMP 3.4
 * Targets Vue-rendered title/subtitle fields in submission wizard and metadata forms.
 */
(function () {

    // ─── Capitalization Engine ──────────────────────────────────────────────────

    var SMALL_WORDS = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|so|the|to|v\.?|vs\.?|via|yet)$/i;

    function capitalizeTitle(str, style) {
        if (!str || !str.trim()) return str;

        switch (style) {
            case 'uppercase': return str.toUpperCase();
            case 'lowercase': return str.toLowerCase();
            case 'sentence':
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            default: // chicago / apa / mla – all use title case
                return str.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function (word, index, full) {
                    // Always capitalize first and last word
                    if (index === 0 || index + word.length === full.length) {
                        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                    }
                    // Keep acronyms / mixed-case words intact
                    if (/[A-Z]{2,}|[A-Z][a-z]/.test(word.slice(1))) return word;
                    // Lowercase small words unless after a colon
                    if (SMALL_WORDS.test(word) && full.charAt(index - 2) !== ':') {
                        return word.toLowerCase();
                    }
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                });
        }
    }

    // ─── Button Factory ─────────────────────────────────────────────────────────

    function makeButton(field) {
        var btn = document.createElement('button');
        btn.textContent = 'aA';
        btn.type = 'button';
        btn.title = 'Auto-capitalize title';
        btn.setAttribute('aria-label', 'Auto-capitalize title');
        btn.className = 'pkpButton title-capitalizer-btn';

        Object.assign(btn.style, {
            marginLeft: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            flexShrink: '0',
        });

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var style = window.titleCapitalizerStyle || 'chicago';
            var newVal = capitalizeTitle(field.value, style);
            if (newVal === field.value) return;

            // Set value using native input value setter so Vue picks it up
            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(field, newVal);

            // Dispatch both input and change events for Vue reactivity
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
        });

        return btn;
    }

    // ─── Field Detection ────────────────────────────────────────────────────────

    /**
     * OJS 3.4 Vue forms render fields with a data-cy attribute or
     * with IDs/names containing "title" / "subtitle".
     * We match all plausible patterns.
     */
    var FIELD_SELECTORS = [
        // Submission wizard & metadata edit (Vue multilingual field)
        'input[name="title"]',
        'input[name^="title["]',
        'input[name="subtitle"]',
        'input[name^="subtitle["]',
        // Fallback: id-based selectors used in older forms / quick-submit
        'input[id^="title"]',
        'input[id^="subtitle"]',
        // data-cy attributes used in OJS 3.4 Vue tests
        'input[data-cy="title"]',
        'input[data-cy="subtitle"]',
    ];

    function processField(field) {
        // Skip if already handled, hidden, or read-only
        if (field.dataset.tcInit || field.type === 'hidden' || field.readOnly) return;
        field.dataset.tcInit = '1';

        // Wrap in a flex container if not already
        var wrapper = field.parentElement;
        if (wrapper && getComputedStyle(wrapper).display !== 'flex') {
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.flexWrap = 'wrap';
        }

        field.insertAdjacentElement('afterend', makeButton(field));
    }

    function scanFields() {
        FIELD_SELECTORS.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(processField);
        });
    }

    // ─── MutationObserver (catches Vue-rendered fields) ─────────────────────────

    var observer = new MutationObserver(function (mutations) {
        var needsScan = mutations.some(function (m) {
            return m.addedNodes.length > 0;
        });
        if (needsScan) scanFields();
    });

    function startObserver() {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ─── Init ───────────────────────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            scanFields();
            startObserver();
        });
    } else {
        scanFields();
        startObserver();
    }

    // Fallback polling for very late Vue mounts (tabs, modals)
    var pollCount = 0;
    var poll = setInterval(function () {
        scanFields();
        if (++pollCount >= 30) clearInterval(poll); // stop after 30 s
    }, 1000);

})();
