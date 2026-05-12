/**
 * Title Capitalizer for OJS/OMP 3.4
 *
 * The Title and Subtitle fields use "field-rich-text" (TinyMCE), NOT plain
 * <input> elements. This script hooks into TinyMCE editors whose IDs contain
 * "title" or "subtitle" and injects an aA button into their container.
 */
(function () {

    // ─── Capitalization Engine ──────────────────────────────────────────────────

    var SMALL_WORDS = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|so|the|to|v\.?|vs\.?|via|yet)$/i;

    function capitalizeTitle(str, style) {
        str = (str || '').replace(/\s+/g, ' ').trim();
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

    // ─── Inject button into a TinyMCE editor container ─────────────────────────

    function addButtonToEditor(editor) {
        var editorId = (editor.id || '').toLowerCase();

        // Only process title / subtitle fields
        if (editorId.indexOf('title') === -1 && editorId.indexOf('subtitle') === -1) {
            return;
        }

        function doInject() {
            var container = editor.getContainer();
            if (!container || container.dataset.tcTinyInit) return;
            container.dataset.tcTinyInit = '1';

            // Make sure the container is positioned so we can overlay the button
            var cs = window.getComputedStyle(container);
            if (cs.position === 'static') {
                container.style.position = 'relative';
            }

            var btn = document.createElement('button');
            btn.textContent = 'aA';
            btn.type = 'button';
            btn.title = 'Auto-capitalize title';
            btn.setAttribute('aria-label', 'Auto-capitalize title');

            Object.assign(btn.style, {
                position:     'absolute',
                top:          '4px',
                right:        '4px',
                zIndex:       '9999',
                padding:      '3px 10px',
                cursor:       'pointer',
                background:   '#1d79a9',
                color:        '#fff',
                border:       'none',
                borderRadius: '3px',
                fontSize:     '12px',
                fontWeight:   'bold',
                lineHeight:   '1.4',
            });

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var style = window.titleCapitalizerStyle || 'chicago';

                // Get plain text (strips bold/italic etc), capitalize, set back
                var text = editor.getContent({ format: 'text' });
                var capitalized = capitalizeTitle(text, style);

                // Preserve any inline HTML structure by only changing text nodes
                // For simplicity (titles are usually plain text), set as text
                editor.setContent(capitalized);
                editor.fire('change');
            });

            container.appendChild(btn);
        }

        if (editor.initialized) {
            doInject();
        } else {
            editor.on('init', doInject);
        }
    }

    // ─── TinyMCE watcher ────────────────────────────────────────────────────────

    function hookTinyMCE() {
        if (typeof tinymce === 'undefined') {
            // TinyMCE not loaded yet – try again shortly
            setTimeout(hookTinyMCE, 400);
            return;
        }

        // Process editors that are already initialized
        if (tinymce.editors && tinymce.editors.length) {
            tinymce.editors.forEach(addButtonToEditor);
        }

        // Process all future editors (Vue tabs load them lazily)
        tinymce.on('AddEditor', function (e) {
            addButtonToEditor(e.editor);
        });
    }

    // ─── Plain <input> fallback (prefix field and any non-TinyMCE fields) ───────

    var INPUT_SELECTORS = [
        'input[name="prefix"]',
        'input[name^="prefix["]',
    ];

    function processInput(field) {
        if (field.dataset.tcInit || field.type === 'hidden' || field.readOnly) return;
        field.dataset.tcInit = '1';

        var btn = document.createElement('button');
        btn.textContent = 'aA';
        btn.type = 'button';
        btn.title = 'Auto-capitalize';

        Object.assign(btn.style, {
            marginLeft:  '6px',
            padding:     '4px 10px',
            fontSize:    '12px',
            fontWeight:  'bold',
            cursor:      'pointer',
            background:  '#1d79a9',
            color:       '#fff',
            border:      'none',
            borderRadius:'3px',
        });

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var style = window.titleCapitalizerStyle || 'chicago';
            var nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(field, capitalizeTitle(field.value, style));
            field.dispatchEvent(new Event('input',  { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
        });

        var wrapper = field.parentElement;
        if (wrapper && window.getComputedStyle(wrapper).display !== 'flex') {
            wrapper.style.display    = 'flex';
            wrapper.style.alignItems = 'center';
        }
        field.insertAdjacentElement('afterend', btn);
    }

    function scanInputs() {
        INPUT_SELECTORS.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(processInput);
        });
    }

    // ─── MutationObserver for dynamically rendered inputs ───────────────────────

    var observer = new MutationObserver(function (mutations) {
        var added = mutations.some(function (m) { return m.addedNodes.length > 0; });
        if (added) scanInputs();
    });

    // ─── Boot ───────────────────────────────────────────────────────────────────

    function boot() {
        hookTinyMCE();
        scanInputs();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
