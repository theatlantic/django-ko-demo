/**
 * @file HTML5 placeholder plugin for CKEditor
 *
 */
(function() {

    "use strict";

    var CKEDITOR = window.CKEDITOR;

    // Check if the browser supports the placeholder attribute on textareas natively.
    var supportsPlaceholder = Object.prototype.hasOwnProperty.call(
        document.createElement('textarea'), 'placeholder');

    // If the data is "empty" (BR, P) or the placeholder then return an empty string.
    // Otherwise return the original data
    function dataIsEmpty(data) {
        if (!data) {
            return true;
        }

        if (data.length > 20) {
            return false;
        }

        var value = data.toLowerCase()
            .replace(/[\n|\t]*/g, '')
            .replace(/<br\s*?\/?>/g, '')
            .replace('&nbsp;', '')
            .replace(/<\/?p>/g, '')
            .replace(' ', '');

        return (!value);
    }

    function getRoot(editor) {
        if (editor.editable) {
            return editor.editable();
        } else {
            if (editor.mode == 'wysiwyg') {
                return (editor.document) ? editor.document.getBody: null;
            } else {
                return editor.textarea;
            }
        }
    }

    function addPlaceholder(ev) {
        var editor = ev.editor,
            root = getRoot(editor);

        if (!root) return;

        var placeholder = editor.element.getAttribute('placeholder') || editor.config.placeholder;
        if (!placeholder) {
            return removePlaceholder(ev);
        }

        if (editor.mode == 'wysiwyg') {
            // If the blur is due to a dialog, don't apply the placeholder
            if (CKEDITOR.dialog._.currentTop) return;

            if (!root) return;

            if (dataIsEmpty(root.getHtml())) {
                root.setHtml(placeholder);
                root.addClass('placeholder');
            }
        }

        if (editor.mode == 'source') {
            if (supportsPlaceholder) {
                if (ev.name == 'mode') {
                    root.setAttribute('placeholder', placeholder);
                }
                return;
            }

            if (dataIsEmpty(root.getValue())) {
                root.setValue(placeholder);
                root.addClass('placeholder');
            }
        }
    }

    function removePlaceholder(ev) {
        var editor = ev.editor,
            root = getRoot(editor);

        if (!root) return;

        if (editor.mode == 'wysiwyg') {
            if (!root.hasClass('placeholder'))
                return;

            root.removeClass('placeholder');
            // fill it properly
            if (CKEDITOR.dtd[root.getName()]['p']) {
                root.setHtml('<p><br/></p>');
                // Set caret in position
                var range = new CKEDITOR.dom.range(editor.document);
                range.moveToElementEditablePosition(root.getFirst(), true);
                editor.getSelection().selectRanges([range]);
            } else {
                root.setHtml(' ');
            }
        }

        if (editor.mode == 'source') {
            if (!root.hasClass('placeholder')) {
                return;
            }

            root.removeClass('placeholder');
            root.setValue('');
        }
    }


    CKEDITOR.plugins.add('html5-placeholder', {

        getPlaceholderCss: function() {
            return '.placeholder{ color: #999; }';
        },

        onLoad: function() {
            // v4
            if (CKEDITOR.addCss) {
                CKEDITOR.addCss(this.getPlaceholderCss());
            }
        },

        init: function(editor) {
            // correct focus status after switch mode
            editor.on('mode', function(ev) {
                // Let's update to match reality
                ev.editor.focusManager.hasFocus = false;
            });

            // Placeholder - Start
            // Get the placeholder from the replaced element or from the configuration
            var placeholder = editor.element.getAttribute('placeholder') || editor.config.placeholder;

            if (placeholder) {
                // CSS for WYSIWYG mode
                // v3
                if (editor.addCss) {
                    editor.addCss(this.getPlaceholderCss());
                }

                // CSS for textarea mode
                var node = CKEDITOR.document.getHead().append('style');
                node.setAttribute('type', 'text/css');
                var content = 'textarea.placeholder { color: #999; font-style: italic; }';

                if (CKEDITOR.env.ie && CKEDITOR.env.version<11) {
                    node.$.styleSheet.cssText = content;
                } else {
                    node.$.innerHTML = content;
                }

                // Watch for the calls to getData to remove the placeholder
                editor.on('getData', function(ev) {
                    var element = getRoot(editor);
                    if (element && element.hasClass('placeholder')) {
                        ev.data.dataValue = '';
                    }
                });

                // Watch for setData to remove placeholder class
                editor.on('setData', function(ev) {
                    if (CKEDITOR.dialog._.currentTop) {
                        return;
                    }

                    if (editor.mode =='source' && supportsPlaceholder) {
                        return;
                    }

                    var root = getRoot(editor);

                    if (!root) return;

                    if (!dataIsEmpty(ev.data.dataValue)) {
                        // Remove the class if new data is not empty
                        if (root.hasClass('placeholder'))
                            root.removeClass('placeholder');
                    } else {
                        // if data is empty, set it to the placeholder
                        addPlaceholder(ev);
                    }
                });

                editor.on('blur', addPlaceholder, null, placeholder);
                editor.on('mode', addPlaceholder, null, placeholder);
                editor.on('contentDom', addPlaceholder, null, placeholder);

                editor.on('focus', removePlaceholder);
                editor.on('beforeModeUnload', removePlaceholder);

                editor.on('updatePlaceholder', addPlaceholder);
            } // Placeholder - End

        }
    });

})();


 /**
  * Placeholder text for empty editor
  * @name CKEDITOR.config.placeholder
  * @type {String}
  * @example
  *    editor.config.placeholder = "Please, type here...";
  */