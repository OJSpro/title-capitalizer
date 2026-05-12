/**
 * Title Capitalizer for OJS/OMP 3.4
 */
(function() {
    /**
     * Capitalization Logic
     */
    function toTitleCase(str, style) {
        if (!str) return str;
        
        if (style === 'uppercase') return str.toUpperCase();
        if (style === 'lowercase') return str.toLowerCase();
        
        if (style === 'sentence') {
            str = str.toLowerCase();
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        // Title Case (General approach covering Chicago/APA/MLA)
        var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v.?|vs.?|via)$/i;

        return str.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function(match, index, title) {
            // Lowercase small words unless they are first or last
            if (index > 0 && index + match.length !== title.length &&
                match.search(smallWords) > -1 && title.charAt(index - 2) !== ":" &&
                (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') &&
                title.charAt(index - 1).search(/[^\s-]/) < 0) {
                return match.toLowerCase();
            }

            // If it has internal caps (acronyms), keep it
            if (match.substr(1).search(/[A-Z]|\../) > -1) {
                return match;
            }

            return match.charAt(0).toUpperCase() + match.substr(1).toLowerCase();
        });
    }

    /**
     * Inject button into standard input fields
     */
    function scanFields() {
        var selectors = [
            'input[id^="title-"]',
            'input[name^="title"]',
            'input[id^="subtitle-"]',
            'input[name^="subtitle"]'
        ];

        selectors.forEach(function(selector) {
            document.querySelectorAll(selector).forEach(function(field) {
                if (field.dataset.titleCapitalizerInit) return;
                field.dataset.titleCapitalizerInit = "true";

                var btn = document.createElement('button');
                btn.innerHTML = 'aA';
                btn.className = 'title-capitalizer-btn';
                btn.title = 'Auto Capitalize Title (aA)';
                btn.type = 'button';
                
                // Styling to match OJS/OMP buttons
                btn.style.marginLeft = '5px';
                btn.style.padding = '4px 10px';
                btn.style.cursor = 'pointer';
                btn.style.border = '1px solid #ccc';
                btn.style.background = '#f7f7f7';
                btn.style.borderRadius = '3px';
                btn.style.fontSize = '12px';
                btn.style.fontWeight = 'bold';
                btn.style.color = '#007ab2';

                btn.onclick = function() {
                    var style = window.titleCapitalizerStyle || 'chicago';
                    field.value = toTitleCase(field.value, style);
                    // Trigger input event for Vue
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                };

                field.parentNode.style.display = 'flex';
                field.parentNode.style.alignItems = 'center';
                field.parentNode.insertBefore(btn, field.nextSibling);
            });
        });
    }

    /**
     * TinyMCE Integration
     */
    function initTinyMCE() {
        if (typeof tinymce === 'undefined') return;

        // Hook into any new editor instances
        tinymce.on('AddEditor', function(e) {
            var editor = e.editor;
            
            // Wait for editor to be ready to add button or modify toolbar
            editor.on('init', function() {
                // Add a custom button to the registry
                editor.ui.registry.addButton('titleCapitalizer', {
                    text: 'aA',
                    tooltip: 'Auto Capitalize Title (aA)',
                    onAction: function() {
                        var style = window.titleCapitalizerStyle || 'chicago';
                        var currentText = editor.getContent({format: 'text'});
                        editor.setContent(toTitleCase(currentText, style));
                    }
                });
            });
        });
    }

    // Run periodically to catch dynamically loaded fields (Vue)
    setInterval(scanFields, 1000);
    
    // Initial runs
    scanFields();
    initTinyMCE();

})();
