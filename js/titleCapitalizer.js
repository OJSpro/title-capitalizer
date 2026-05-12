/**
 * Title Capitalizer for OJS/OMP 3.4
 *
 * Uses event delegation on document to auto-capitalize Title and Subtitle
 * fields on blur and paste. Works even with Vue lazy-rendered components.
 */
(function () {

    // ─── Capitalization Engine ──────────────────────────────────────────────────

    var SMALL_WORDS = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|so|the|to|v\.?|vs\.?|via|yet)$/i;

    function capitalizeTitle(str, style) {
        str = (str || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
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

    // ─── Is this element an editable field? ────────────────────────────────────

    function isEditable(el) {
        if (!el || !el.tagName) return false;
        var tag = el.tagName.toUpperCase();
        return (
            tag === 'INPUT' ||
            tag === 'TEXTAREA' ||
            el.isContentEditable ||
            el.contentEditable === 'true'
        );
    }

    // ─── Is this a title or subtitle field? ────────────────────────────────────

    function isTitleOrSubtitleField(el) {
        // Check 1: name / id / placeholder attributes
        var attrs = [
            (el.name        || '').toLowerCase(),
            (el.id          || '').toLowerCase(),
            (el.placeholder || '').toLowerCase(),
        ];
        for (var i = 0; i < attrs.length; i++) {
            if (/\btitle\b|\bsubtitle\b/.test(attrs[i])) return true;
        }

        // Check 2: data-* attributes
        var dsName = (el.dataset && el.dataset.fieldName || '').toLowerCase();
        if (/\btitle\b|\bsubtitle\b/.test(dsName)) return true;

        // Check 3: walk up DOM looking for a label or wrapper that says Title/Subtitle
        var node = el.parentElement;
        var depth = 0;
        while (node && depth < 8) {
            // Look for sibling or child <label> elements
            var labels = node.querySelectorAll('label');
            for (var j = 0; j < labels.length; j++) {
                var labelText = labels[j].textContent.replace(/\s*\*$/, '').trim().toLowerCase();
                if (labelText === 'title' || labelText === 'subtitle') {
                    return true;
                }
            }
            // Also check aria-label on the element itself
            var ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
            if (/\btitle\b|\bsubtitle\b/.test(ariaLabel)) return true;

            node = node.parentElement;
            depth++;
        }

        return false;
    }

    // ─── Apply capitalization to an element ────────────────────────────────────

    function applyCapitalization(el) {
        var style = window.titleCapitalizerStyle || 'chicago';
        var tag = el.tagName.toUpperCase();

        if (tag === 'INPUT' || tag === 'TEXTAREA') {
            var current = el.value;
            var capitalized = capitalizeTitle(current, style);
            if (capitalized === current) return;
            // Native setter triggers Vue v-model
            var setter = Object.getOwnPropertyDescriptor(
                tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
                'value'
            ).set;
            setter.call(el, capitalized);
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));

        } else if (el.isContentEditable || el.contentEditable === 'true') {
            var text = el.innerText || el.textContent || '';
            var capitalized = capitalizeTitle(text, style);
            if (capitalized === text.trim()) return;
            // Preserve cursor — just update text content
            if (typeof el.innerText !== 'undefined') {
                el.innerText = capitalized;
            } else {
                el.textContent = capitalized;
            }
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // ─── Event delegation – blur (capture phase catches all elements) ──────────

    document.addEventListener('blur', function (e) {
        var el = e.target;
        if (!isEditable(el)) return;
        if (!isTitleOrSubtitleField(el)) return;
        applyCapitalization(el);
    }, true); // <-- capture=true is essential for blur delegation

    // ─── Event delegation – paste ──────────────────────────────────────────────

    document.addEventListener('paste', function (e) {
        var el = e.target;
        if (!isEditable(el)) return;
        if (!isTitleOrSubtitleField(el)) return;
        setTimeout(function () { applyCapitalization(el); }, 120);
    }, true);

})();
