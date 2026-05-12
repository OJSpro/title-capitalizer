/**
 * Title Capitalizer for OJS/OMP 3.4
 *
 * Hooks into TinyMCE editors for Title and Subtitle fields and auto-capitalizes
 * on blur and paste events. Uses the same pattern as PlainPaste plugin.
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

    // ─── Is this a title or subtitle editor? ───────────────────────────────────

    function isTitleEditor(editor) {
        var id = (editor.id || '').toLowerCase();
        // Matches: titleAbstract-title-control-en, titleAbstract-subtitle-control-en
        // The word "title" appears as a dash-delimited segment, not just "titleabstract"
        return /-title-|-subtitle-/.test(id);
    }

    // ─── Capitalize the content of a TinyMCE editor ────────────────────────────

    function applyToEditor(editor) {
        var style = window.titleCapitalizerStyle || 'chicago';
        var text = editor.getContent({ format: 'text' }).trim();
        var capitalized = capitalizeTitle(text, style);
        if (!capitalized || capitalized === text) return;
        console.log('TitleCapitalizer: capitalizing "' + text + '" → "' + capitalized + '"');
        editor.setContent(capitalized);
        editor.fire('change');
    }

    // ─── Hook one editor ───────────────────────────────────────────────────────

    function setupEditor(editor) {
        if (!isTitleEditor(editor)) return;
        if (editor._tcHooked) return;
        editor._tcHooked = true;

        console.log('TitleCapitalizer: hooking editor ' + editor.id);

        // Auto-capitalize on blur (user clicks away)
        editor.on('blur', function () {
            applyToEditor(editor);
        });

        // Auto-capitalize on paste (after paste completes)
        editor.on('PastePreProcess PastePostProcess', function () {
            setTimeout(function () { applyToEditor(editor); }, 200);
        });
    }

    // ─── Initialize (mirrors PlainPaste pattern exactly) ───────────────────────

    function init() {
        if (typeof tinymce === 'undefined') {
            return false;
        }

        // Apply to any already initialized editors
        tinymce.get().forEach(function (editor) {
            setupEditor(editor);
        });

        // Listen for any new editors being added (Vue lazy-loads tabs)
        tinymce.on('AddEditor', function (e) {
            setupEditor(e.editor);
        });

        return true;
    }

    // Attempt initialization immediately
    if (!init()) {
        // TinyMCE not ready yet — poll until it is (same as PlainPaste)
        var attempts = 0;
        var maxAttempts = 20;
        var poll = setInterval(function () {
            attempts++;
            if (init() || attempts >= maxAttempts) {
                clearInterval(poll);
            }
        }, 500);
    }

})();
