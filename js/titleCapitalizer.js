/**
 * Title Capitalizer for OJS/OMP 3.4
 *
 * Auto-capitalizes the Title and Subtitle fields on blur and paste.
 * Works with plain <input>, contenteditable divs, and TinyMCE inline editors.
 * Detects fields by their visible label text ("Title" / "Subtitle").
 */
(function () {

    // ─── Capitalization Engine ──────────────────────────────────────────────────

    var SMALL_WORDS = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|so|the|to|v\.?|vs\.?|via|yet)$/i;

    function capitalizeTitle(str, style) {
        str = (str || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); // strip HTML
        if (!str) return str;

        switch (style) {
            case 'uppercase': return str.toUpperCase();
            case 'lowercase': return str.toLowerCase();
            case 'sentence':
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            default: // chicago / apa / mla – title case
                return str.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function (word, index, full) {
                    if (index === 0 || index + word.length === full.length) {
                        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                    }
                    if (/[A-Z]{2,}/.test(word)) return word; // keep acronyms
                    if (SMALL_WORDS.test(word) && full.charAt(index - 2) !== ':') {
                        return word.toLowerCase();
                    }
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                });
        }
    }

    // ─── Apply to an element (input or contenteditable) ────────────────────────

    function applyCapitalization(el) {
        var style = window.titleCapitalizerStyle || 'chicago';

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            var newVal = capitalizeTitle(el.value, style);
            if (newVal === el.value) return;
            // Use native setter so Vue's v-model reacts
            var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(el, newVal);
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.isContentEditable) {
            var text = el.innerText || el.textContent || '';
            var newText = capitalizeTitle(text, style);
            if (newText === text.trim()) return;
            el.textContent = newText;
            // Trigger Vue reactivity
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // ─── Attach listeners to a field element ───────────────────────────────────

    function attachListeners(el) {
        if (el.dataset.tcAutoInit) return;
        el.dataset.tcAutoInit = '1';

        // Auto-capitalize when user leaves the field
        el.addEventListener('blur', function () {
            applyCapitalization(el);
        });

        // Auto-capitalize after paste (short delay to let paste complete)
        el.addEventListener('paste', function () {
            setTimeout(function () { applyCapitalization(el); }, 100);
        });
    }

    // ─── Find title/subtitle fields by label text ───────────────────────────────

    var TARGET_LABELS = ['title', 'subtitle'];

    function isTargetLabel(text) {
        var t = (text || '').trim().toLowerCase().replace(/\s*\*\s*$/, ''); // strip required asterisk
        return TARGET_LABELS.indexOf(t) !== -1;
    }

    function scanForFields() {
        // Strategy 1: Find <label> elements whose text is "Title" or "Subtitle",
        // then look for an input/contenteditable sibling or child nearby.
        document.querySelectorAll('label').forEach(function (label) {
            if (!isTargetLabel(label.textContent)) return;

            // The field element is usually a sibling or in the same parent wrapper
            var wrapper = label.closest('.pkpFormField') || label.parentElement;
            if (!wrapper) return;

            // Try: plain input
            wrapper.querySelectorAll('input[type="text"], input:not([type])').forEach(attachListeners);

            // Try: contenteditable (TinyMCE inline or native)
            wrapper.querySelectorAll('[contenteditable="true"]').forEach(attachListeners);
        });

        // Strategy 2: Match by name/id containing "title" or "subtitle"
        document.querySelectorAll(
            'input[name="title"], input[name^="title["],' +
            'input[name="subtitle"], input[name^="subtitle["],' +
            'input[id*="title"], input[id*="subtitle"],' +
            '[contenteditable="true"][id*="title"],' +
            '[contenteditable="true"][id*="subtitle"]'
        ).forEach(attachListeners);
    }

    // ─── MutationObserver – catches Vue lazy-rendered tabs ─────────────────────

    var observer = new MutationObserver(function (mutations) {
        if (mutations.some(function (m) { return m.addedNodes.length > 0; })) {
            scanForFields();
        }
    });

    // ─── Boot ───────────────────────────────────────────────────────────────────

    function boot() {
        scanForFields();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
