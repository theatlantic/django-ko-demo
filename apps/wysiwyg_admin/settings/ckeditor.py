from __future__ import absolute_import

# import os

from django.utils.functional import lazy
from django.core.urlresolvers import reverse

# from . import STATIC_URL, MEDIA_ROOT, MEDIA_URL

lazy_reverse = lazy(reverse, str)

def _lazy_static_url(url):
    from django.contrib.staticfiles.storage import staticfiles_storage
    return staticfiles_storage.url(url)
lazy_static_url = lazy(_lazy_static_url, str)

CKEDITOR_DEBUG = False

CKEDITOR_CONFIGS = {
    'inline_styles': {
        # 'skin': 'moonocolor',
        # 'contentsCss': lazy_static_url('custom_admin/css/ckeditor/default.css'),
        "toolbar": [
            ["Source", "RemoveFormat", "-", "Bold", "Italic", "Strike", "Subscript", "Superscript", "-", "Link", "Unlink", "-", "SpecialChar"],
        ],
        # Removing unused plugins greatly increases the speed of initialization
        'removePlugins': "about,a11yhelp,bidi,blockquote,colorbutton,colordialog,div,elementspath,filebrowser,find,flash,font,format,forms,horizontalrule,image,iframe,indentlist,indentblock,justify,list,maximize,newpage,pagebreak,pastefromword,pastetext,preview,print,save,showblocks,showborders,smiley,stylescombo,table,tabletools,templates",
        'extraPlugins': 'stripnbsp,html5-placeholder,autocorrect',
        'height': 85,
        'width': 790,
        'enterMode': 2,  # equivalent to CKEDITOR.ENTER_BR, prevents <p> tags from being added
        'shiftEnterMode': 2,
        'allowedContent': 'b; big; i; small; tt; abbr[!title]; acronym[!title]; '
                          'cite; code; dfn[title]; em; kbd; strong; samp; var; '
                          'a[!href, title]; bdo[dir]; br; '
                          'img[!src height width alt sizes srcset usemap crossorigin ]; '
                          'q[cite]; span; sub; sup;',
        'title': False,  # hide the title tooltip on inline CKEditor instances
        # autocorrect plugin settings - for smart quotes, etc
        'autocorrect_createHorizontalRules': False,
        'autocorrect_recognizeUrls': False,
        'autocorrect_dash': u"\u2014",
        'autocorrect_formatOrdinals': False,  #1st, 2nd, etc...
    },
}

CKEDITOR_CONFIGS['inline_styles_header'] = dict(CKEDITOR_CONFIGS['inline_styles'], **{
    "toolbar": [
        ["Source", "-", "Italic"],
    ],
})

CKEDITOR_CONFIGS['only_links'] = dict(CKEDITOR_CONFIGS['inline_styles'], **{
    "toolbar": [
        ["Source", "-", "SimpleLink"],
    ],
    "extraPlugins": "simplelink,html5-placeholder,stripnbsp,autocorrect",
})

CKEDITOR_CONFIGS['only_single_link'] = dict(CKEDITOR_CONFIGS['only_links'], **{
    "simplelinkSingleLink": True,
})

CKEDITOR_CONFIGS['no_styles'] = dict(CKEDITOR_CONFIGS['inline_styles'], **{
    'removePlugins': 'toolbar,%s' % CKEDITOR_CONFIGS['inline_styles']['removePlugins'],
    'allowedContent': "",
    # Prevent line breaks; 13 = keycode for enter, 2228224 = CKEDITOR.SHIFT
    'blockedKeystrokes': [13, 2228224 + 13],
})


CKEDITOR_TIMESTAMP = 'E89I'
MAX_UPLOAD_SIZE = 20 * (1024 ** 2)  # 20MB
