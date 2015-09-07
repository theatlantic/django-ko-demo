(function() {

    /**
     * Automatically strip out non-breaking spaces added inadvertently by CKeditor
     *
     * Remove all &nbsp; that aren't adjacent to another &nbsp; or to a space 
     * when the `toDataFormat` event is called (ie, when switching from WYSIWYG
     * to source view or on saving).
     */
    CKEDITOR.plugins.add('stripnbsp',
    {
        init: function(editor)
        {
            var regex = /( ?&nbsp; ?)+/g
            editor.on("toDataFormat", function (evt) {
                if (evt.data.dataValue.getHtml) {
                    var html = evt.data.dataValue.getHtml();
                    html = html.replace(regex, function (x) { 
                        if (x.length == 6) {
                            return " ";
                        } else {
                            return x;
                        }
                    });
                    evt.data.dataValue.setHtml(html);
                }
            }, null, null, 14);
        },
    });
})();
