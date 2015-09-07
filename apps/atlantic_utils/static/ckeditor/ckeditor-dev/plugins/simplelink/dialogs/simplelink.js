CKEDITOR.dialog.add("simplelinkDialog", function(editor) {
    return {
        allowedContent: "a[href]",
        title: "Link",
        minWidth: 550,
        minHeight: 70,
        resizable: CKEDITOR.DIALOG_RESIZE_NONE,
        contents: [{
            id: "simplelink",
            label: "Link",
            elements: [{
                type: "text",
                label: "URL",
                id: "edp-URL",
                setup: function(element) {
                    var href = element.getAttribute("href");
                    if (href && !(/^(http|https):\/\//.test(href))) {
                        href = "http://" + href;
                    }
                    this.setValue(href);
                },
                commit: function(element) {
                    var href = this.getValue();
                    if (href) {
                        if (!(/^(http|https):\/\//.test(href))) {
                            href = "http://" + href;
                        }
                        element.setAttribute("href", href);
                        if (!element.getText()) {
                            element.setText(this.getValue());
                        }
                        editor.getCommand('simplelink').setState(CKEDITOR.TRISTATE_ON);
                    } else {
                        element.remove(true);
                        editor.getCommand('simplelink').setState(CKEDITOR.TRISTATE_OFF);
                    }
                }
            }]
        }],
        onShow: function() {
            if (editor.config.simplelinkSingleLink) {
                var editable = editor.editable();

                if (editable.is('textarea')) {
                    var textarea = editable.$;

                    if (CKEDITOR.env.ie)
                        textarea.createTextRange().execCommand('SelectAll');
                    else {
                        textarea.selectionStart = 0;
                        textarea.selectionEnd = textarea.value.length;
                    }

                    textarea.focus();
                } else {
                    if (editable.is('body'))
                        editor.document.$.execCommand('SelectAll', false, null);
                    else {
                        var range = editor.createRange();
                        range.selectNodeContents(editable);
                        range.select();
                    }

                    // Force triggering selectionChange (#7008)
                    editor.forceNextSelectionCheck();
                    editor.selectionChange();
                }
            }

            var selection = editor.getSelection();
            var selector = selection.getStartElement();
            var element;

            if (selector) {
                element = selector.getAscendant('a', true);
            }

            if (!element || element.getName() != 'a') {
                element = editor.document.createElement('a');
                if (selection) {
                    element.setText(selection.getSelectedText());
                }
                this.insertMode = true;
            } else {
                this.insertMode = false;
            }

            this.element = element;


            this.setupContent(this.element);
        },
        onOk: function() {
            var anchorElement = this.element;

            this.commitContent(anchorElement);

            if (this.insertMode) {
                editor.insertElement(anchorElement);
            }
        }
    };
});
