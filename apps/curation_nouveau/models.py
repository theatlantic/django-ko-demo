# coding=utf-8
from django.core.exceptions import ObjectDoesNotExist
from django.db import models

from curation.models import CuratedItem
from curation.fields import CuratedGenericForeignKey, ContentTypeSourceField

from cropduster.models import CropDusterField, Size

from .managers import ProxySectionManager


class Section(models.Model):

    name = models.CharField(max_length=128)
    slug = models.SlugField(unique=True)

    def __unicode__(self):
        return self.name


class Module(models.Model):

    section = models.ForeignKey(Section)
    position = models.PositiveIntegerField()

    LAYOUTS = (
        ("stash", "Stash"),
        ("hero", "Hero"),
        ("hero-ramp", "Hero Ramp"),
        ("more-news", "More News"),
        ("single-third", u"⅓ thumb, ⅔ text"),
        ("single-two-thirds", u"⅔ image, ⅓ text"),
        ("single-half", u"half image, half text"),
        ("collection-2", u"2 articles with thumbs"),
        ("collection-5", "3 cols: 2 articles, 1 related col"),
        ("pullquote-module", "Pullquote"),
    )
    layout = models.CharField(max_length=24, choices=LAYOUTS)
    title_text = models.CharField(max_length=128, blank=True, default='')
    title_url = models.URLField(max_length=255, blank=True, default='')

    class Meta:
        app_label = 'curation_nouveau'
        ordering = ('position', )

    def save(self, **kwargs):
        if self.position == 0:
            self.layout = "stash"
        super(Module, self).save(**kwargs)

    def __unicode__(self):
        if self.layout == 'stash':
            return u"Stash"
        return 'Module %d' % self.position


class Item(CuratedItem):

    module = models.ForeignKey(Module, null=True, blank=True)
    date_modified = models.DateTimeField(auto_now=True)

    CONTENT_TYPES = (
        ('magazine.MagArticle', 'Magazine Article', 'mag'),
        ('self.url', 'URL', 'url'),
    )

    field_overrides = {
        'title': 'custom_title',
        'dek': 'custom_dek',
    }

    source = models.CharField(max_length=8, null=True, blank=True)
    content_type = ContentTypeSourceField(ct_choices=CONTENT_TYPES,
        source_field='source', null=True, blank=True)
    object_id = models.PositiveIntegerField("Id", null=True, blank=True)
    content_object = CuratedGenericForeignKey("content_type", "object_id")

    IMAGE_SIZES = [
        Size('960', w=960, h=594, label='Standard', auto=[
            Size('960@2x', w=1920, h=1188, required=False),
            Size('768', w=768, h=474), # hero (tablet)
            Size('768@2x', w=1536, h=948, required=False),
            Size('630', w=630, h=390), # single-two-thirds
            Size('630@2x', w=1260, h=780, required=False),
            Size('600', w=600, h=372),
            Size('465', w=465, h=287), # collection-2
            Size('465@2x', w=930, h=574),
            Size('300', w=300, h=186), # single-third
            Size('240', w=240, h=148), # small mobile (retina)
            Size('120', w=120, h=74),  # small mobile
        ]),
    ]

    image = CropDusterField("Image", upload_to="img/curation/homepage/%Y_%m",
        null=True, blank=True, sizes=IMAGE_SIZES, missing_file_fallback=False)
    custom_title = models.CharField(max_length=255, null=True, blank=True,
        db_column='title')
    custom_dek = models.CharField(max_length=2500, null=True, blank=True,
        db_column="dek")
    custom_byline = models.CharField(max_length=255, null=True, blank=True,
        db_column='byline')

    url = models.URLField(null=True, blank=True, verbose_name='URL', max_length=500)

    class Meta:
        app_label = 'curation_nouveau'
        ordering = ('position', )

    def __getattribute__(self, name):
        if name == 'lead_image':
            return Item._meta.get_field('image').file_descriptor.__get__(self)
        return CuratedItem.__getattribute__(self, name)

    def __unicode__(self):
        try:
            return getattr(self, 'title', u'Untitled Article')
        except ObjectDoesNotExist:
            return u'Untitled Article'

    def get_absolute_url(self):
        if self.url:
            return self.url
        elif self.content_object:
            return self.content_object.get_absolute_url()

    def save(self, *args, **kwargs):
        if self.content_object:
            self.custom_title = self.title
            self.custom_dek = getattr(self, 'dek', getattr(self, 'description', None)) or ''
            if not hasattr(self.content_object, 'authors') and hasattr(self.content_object, 'byline'):
                self.custom_byline = self.content_object.byline
        if not self.position:
            self.position = 0
        super(Item, self).save(*args, **kwargs)


class HomepageSection(Section):

    section_slug = 'homepage'
    section_name = 'Homepage'

    objects = ProxySectionManager()

    class Meta:
        proxy = True
        verbose_name = "Homepage"
        verbose_name_plural = "Homepage"
