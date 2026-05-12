/**
 * Title Capitalizer for OJS/OMP 3.4
 *
 * Title and Subtitle fields are TinyMCE editors inside iframes
 * (IDs: titleAbstract-title-control-en, titleAbstract-subtitle-control-en).
 * We hook into TinyMCE API events to auto-capitalize on blur and paste.
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
            default: // title case (chicago/apa/mla)
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

    // ─── Is this editor a title or subtitle field? ──────────────────────────────

    function isTitleOrSubtitleEditor(editor) {
        var id = (editor.id || '').toLowerCase();
        // Matches: titleAbstract-title-control-en, titleAbstract-subtitle-control-en
        // and any locale variant (e.g. -fr, -de)
        return /\btitle\b/.test(id) || /\bsubtitle\b/.test(id);
    }

    // ─── Capitalize the content of a TinyMCE editor ────────────────────────────

    function applyToEditor(editor) {
        var style = window.titleCapitalizerStyle || 'chicago';
        // getContent({format:'text'}) strips all HTML tags
        var text = editor.getContent({ format: 'text' });
        var capitalized = capitalizeTitle(text, style);
        if (!capitalized || capitalized === text.trim()) return;
        editor.setContent(capitalized);
        editor.fire('change');
        editor.fire('input');
    }

    // ─── Attach listeners to one editor ────────────────────────────────────────

    function hookEditor(editor) {
        if (!isTitleOrSubtitleEditor(editor)) return;
        if (editor._tcHooked) return;
        editor._tcHooked = true;

        // Auto-capitalize when user leaves the field
        editor.on('blur', function () {
            applyToEditor(editor);
        });

        // Auto-capitalize after paste (wait 150ms for paste to complete)
        editor.on('paste', function () {
            setTimeout(function () { applyToEditor(editor); }, 150);
        });
    }

    // ─── Wait for TinyMCE to be available ──────────────────────────────────────

    function hookTinyMCE() {
        if (typeof tinymce === 'undefined') {
            // TinyMCE not loaded yet — retry
            setTimeout(hookTinyMCE, 300);
            return;
        }

        // Hook into editors already initialized (e.g. page loaded with tab open)
        if (tinymce.editors && tinymce.editors.length) {
            tinymce.editors.forEach(hookEditor);
        }

        // Hook into all future editors (Vue lazy-loads tabs)
        tinymce.on('AddEditor', function (e) {
            var editor = e.editor;
            // Editor may not be fully initialized yet — wait for init
            editor.on('init', function () {
                hookEditor(editor);
            });
            // Also try immediately in case it's already initialized
            hookEditor(editor);
        });
    }

    // ─── Boot ───────────────────────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hookTinyMCE);
    } else {
        hookTinyMCE();
    }

})();
