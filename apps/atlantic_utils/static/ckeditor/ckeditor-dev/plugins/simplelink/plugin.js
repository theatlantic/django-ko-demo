(function() {

    CKEDITOR.plugins.add('simplelink', {
        icons: 'simplelink',
        hidpi: true,
        init: function(editor) {
            editor.addCommand('simplelink', new CKEDITOR.dialogCommand('simplelinkDialog'));
            editor.ui.addButton('SimpleLink', {
                label: 'Add a link',
                command: 'simplelink',
                icons: 'simplelink'
            });

            CKEDITOR.dialog.add('simplelinkDialog', this.path + 'dialogs/simplelink.js');
        }
    });

    CKEDITOR.tools.extend(CKEDITOR.config, {
        /**
         * Whether to wrap the link around all content, not just the selection
         */
        simplelinkSingleLink: false
    });

})();
