from django.core.exceptions import ValidationError


class LayoutRequirements(object):

    def __init__(self, name, articles=1, images=0, deks=0):
        self.name = name
        self.articles = articles
        self.images = images
        self.deks = deks

    """
    Validate that a homepage item has all fields required within the layout
    in its current position.

    Parameters
    ----------
    cleaned_data: dict
        The HomepageItemInlineForm's cleaned data
    """
    def validate(self, cleaned_data, module_position):
        self.validate_image(cleaned_data, module_position)
        self.validate_dek(cleaned_data)
        self.validate_title(cleaned_data)
        if cleaned_data.get('source') == 'url':
            self.validate_url(cleaned_data)

    def raise_error(self, cleaned_data, message):
        position = cleaned_data['position']
        pos = '' if self.articles == 1 else position + 1
        raise ValidationError("Article %s %s" % (pos, message))

    def validate_url(self, cleaned_data):
        if not cleaned_data.get('url'):
            self.raise_error(cleaned_data, "requires a URL")

    def validate_title(self, cleaned_data):
        if not cleaned_data.get('custom_title'):
            self.raise_error(cleaned_data, "requires a title")

    def validate_image(self, cleaned_data, module_position):
        position = cleaned_data['position']
        if position >= self.images:
            return
        if cleaned_data.get('image'):
            return
        self.raise_error(cleaned_data, "requires an image")

    def validate_dek(self, cleaned_data):
        position = cleaned_data['position']
        if position >= self.deks:
            return
        if cleaned_data.get('custom_dek'):
            return
        dek_name = 'quote' if self.name == 'pullquote-module' else 'dek'
        self.raise_error(cleaned_data, "requires a %s" % dek_name)


layout_validators = {
    'stash': LayoutRequirements('stash', articles=0, images=0, deks=0),
    'hero': LayoutRequirements('hero', articles=1, images=1, deks=1),
    'hero-ramp': LayoutRequirements('hero-ramp', articles=1, images=1, deks=0),
    'more-news': LayoutRequirements('more-news', articles=4, images=1, deks=1),
    'single-third': LayoutRequirements('single-third', articles=1, images=1, deks=1),
    'single-half': LayoutRequirements('single-half', articles=1, images=1, deks=1),
    'single-two-thirds': LayoutRequirements('single-two-thirds', articles=1, images=1, deks=1),
    'collection-2': LayoutRequirements('collection-2', articles=2, images=2, deks=2),
    'collection-5': LayoutRequirements('collection-2', articles=5, images=2, deks=2),
    'pullquote-module': LayoutRequirements('pullquote-module', articles=1, images=0, deks=1),
}


def validate_item_for_layout(layout, module_position, cleaned_data):
    if layout not in layout_validators:
        raise ValidationError("Unrecognized module layout '%s'" % layout)
    validator = layout_validators[layout]
    validator.validate(cleaned_data, module_position)
