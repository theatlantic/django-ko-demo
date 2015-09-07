import re
import json

import lxml

from django.contrib import admin
from django.contrib.admin.helpers import AdminErrorList
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django import forms

from cropduster.models import Image

import nested_admin

from .models import Item, Module, HomepageSection
from .utils import (
    import_existing_image, ImageImportError, humanize_list, naturaldatetime)
from .validation import validate_item_for_layout


def serialize_item(item):
    data = {
        "source": item.source,
        "content_type": item.content_type_id,
        "object_id": item.object_id,
        "custom_title": item.custom_title,
        "custom_dek": item.custom_dek,
        "url": item.url,
        "primary_id": item.primary_id,
    }
    if item.content_type_id and item.object_id:
        article = item.content_object
        if hasattr(article, 'authors'):
            data['byline'] = humanize_list(article.authors.all())
        elif getattr(item, 'custom_byline', None):
            data['custom_byline'] = item.custom_byline

        date_published = getattr(article, 'date_published', getattr(article, 'date', None))

        data['date_published_display'] = naturaldatetime(date_published) or ''
    return data


class HomepageItemAdminForm(forms.ModelForm):

    class Meta:
        model = Item
        fields = ('content_type', 'object_id', 'url')

    def clean(self):
        cleaned_data = super(HomepageItemAdminForm, self).clean()
        ct_id = cleaned_data.get('content_type')

        if not cleaned_data.get('content_type'):
            raise ValidationError("A content-type is required")

        content_type = ContentType.objects.get(pk=ct_id)
        model_cls = content_type.model_class()

        if model_cls == Item:
            if not cleaned_data.get('url'):
                raise ValidationError("A URL is required")
        else:
            if not cleaned_data.get('object_id'):
                raise ValidationError("An article is required")

        return cleaned_data


class HomepageItemAdmin(nested_admin.NestedAdmin):

    form = HomepageItemAdminForm

    fieldsets = (
        (None, {
            'fields': ('content_type', 'object_id', 'url'),
        }),
    )

    class Media:
        css = {
            'all': (
                'curation_nouveau/css/homepage-item.css',
            ),
        }

    def response_add(self, request, obj, post_url_continue='../%s/'):
        pk_value = obj._get_pk_val()
        serialized_data = serialize_item(obj)

        try:
            import_existing_image(obj)
        except ImageImportError as e:
            serialized_data['image_import_error'] = unicode(e)
        else:
            cropduster_image = Image.objects.get(
                object_id=obj.pk,
                content_type=ContentType.objects.get_for_model(obj),
                field_identifier='')
            serialized_data.update({
                'image_import_error': '',
                'image-0-id': cropduster_image.pk,
                'image-0-image': cropduster_image.image.name,
                'image-0-DELETE': False,
                'image-0-thumbs': [
                    {
                        'id': t.pk,
                        'width': t.width,
                        'height': t.height,
                        'name': t.name,
                    } for t in cropduster_image.thumbs.all()],
                'image-0-attribution': cropduster_image.attribution,
                'image-0-attribution_link': cropduster_image.attribution_link,
                'image-0-caption': cropduster_image.caption,
                'image-0-field_identifier': '',
                'image-TOTAL_FORMS': 1,
                'image-INITIAL_FORMS': 1,
                'image-MAX_NUM_FORMS': 1,
            })

        if "_popup" in request.POST:
            return HttpResponse(
                '<!DOCTYPE html><html><head><title></title></head><body>'
                '<script type="text/javascript">window.top.onArticleAdd(window, "%s", %s);</script></body></html>' % \
                (pk_value, json.dumps(serialized_data)))

        return super(HomepageItemAdmin, self).response_add(request, obj, post_url_continue)


class HomepageItemInlineForm(forms.ModelForm):

    byline = forms.CharField(max_length=1024, required=False)
    date_published_display = forms.CharField(max_length=255, required=False)
    image_import_error = forms.CharField(max_length=1024, required=False)
    form_errors = forms.CharField(max_length=65535, required=False)

    class Meta:
        model = Item
        exclude = []

    def __init__(self, *args, **kwargs):
        initial = kwargs.pop('initial', {})
        if 'instance' in kwargs:
            instance = kwargs['instance']
            if instance.content_type_id and instance.object_id:
                article = instance.content_object
                if hasattr(article, 'authors'):
                    initial['byline'] = humanize_list(article.authors.all())
                date_published = getattr(article, 'date_published', getattr(article, 'date', None))
                if date_published:
                    initial['date_published_display'] = naturaldatetime(date_published)
        kwargs['initial'] = initial
        super(HomepageItemInlineForm, self).__init__(*args, **kwargs)
        # Clear out form errors that might be from the previous request
        form_errors_key = self.add_prefix('form_errors')
        if form_errors_key in self.data:
            self.data[form_errors_key] = ''

    def clean(self):
        cleaned_data = super(HomepageItemInlineForm, self).clean()
        if 'position' not in cleaned_data:
            raise ValidationError("Article is missing 'position' field")
        if not cleaned_data.get('content_type'):
            position = cleaned_data['position'] + 1
            raise ValidationError("Article %s is empty" % position)
        module_prefix = re.sub(r'item_set\-\d+$', '', self.prefix)
        layout = self.data.get("%slayout" % module_prefix)
        module_position = self.data.get("%sposition" % module_prefix)
        validate_item_for_layout(layout, module_position, cleaned_data)

        return cleaned_data


class HomepageItemInline(nested_admin.NestedStackedInline):

    model = Item
    extra = 0
    sortable_field_name = "position"
    form = HomepageItemInlineForm


class ModuleInlineForm(forms.ModelForm):

    title = forms.CharField(max_length=400, required=False)

    class Meta:
        exclude = []
        model = Module

    def __init__(self, *args, **kwargs):
        initial = kwargs.pop('initial', {})
        if 'instance' in kwargs:
            instance = kwargs['instance']
            title = instance.title_text
            if instance.title_url:
                title = '<a href="%s">%s</a>' % (instance.title_url, title)
            initial['title'] = title
        kwargs['initial'] = initial
        super(ModuleInlineForm, self).__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super(ModuleInlineForm, self).clean()
        title = cleaned_data.get('title')
        if title:
            try:
                element = lxml.html.fragment_fromstring("<div>%s</div>" % title)
            except:
                pass
            else:
                try:
                    link = element.xpath('//a')[0]
                except IndexError:
                    pass
                else:
                    cleaned_data['title_url'] = link.attrib.get('href') or ''
                cleaned_data['title_text'] = element.text_content()

        return cleaned_data


class ModuleInline(nested_admin.NestedStackedInline):

    model = Module
    form = ModuleInlineForm
    inlines = [HomepageItemInline]
    extra = 0
    sortable_field_name = "position"


class HomepageSectionAdmin(nested_admin.NestedAdmin):

    change_form_template = "admin/curation_nouveau/homepagesection/change_form.html"
    sortable_options = {
        'axis': 'y',
    }
    inlines = [ModuleInline]
    exclude = ('slug', 'name')
    list_display = ['__unicode__']

    @property
    def media(self):
        return super(HomepageSectionAdmin, self).media + forms.Media(css={
            'all': (
                'curation_nouveau/js/lib/select2/select2.css',
                'curation_nouveau/css/homepage.css?v=12',
            ),
        },
        js=(
            'curation_nouveau/js/lib/picturefill.js',
            'ckeditor/ckeditor/ckeditor.js',
            reverse('ckeditor_configs'),
            'ckeditor/django/jquery_adapter.js',
            'ckeditor/django/widget.js',
            'curation_nouveau/js/lib/angular-expressions.js',
            'curation_nouveau/js/lib/bootstrap.js',
            'curation_nouveau/js/lib/bootstrap-dialog.js',
            'curation_nouveau/js/lib/knockout.js?v=1',
            'curation_nouveau/js/lib/knockout.mapping.js',
            'curation_nouveau/js/lib/knockout.switch-case.js',
            'curation_nouveau/js/lib/knockout.ckeditor.js',
            'curation_nouveau/js/lib/knockout.contenteditable.js',
            'curation_nouveau/js/lib/knockout.select2.js',
            'curation_nouveau/js/lib/sortable.js?v=1',
            'curation_nouveau/js/lib/knockout-sortable.js?v=1',
            'curation_nouveau/js/lib/jquery.big-slide.js',
            'curation_nouveau/js/homepage-models.js?v=14',
            'curation_nouveau/js/homepage.js?v=7',
        ))

    def save_view_formsets(self, request, instance, form, formsets, is_new=False):
        super(HomepageSectionAdmin, self).save_view_formsets(request, instance, form, formsets, is_new)
        # sync up module positions, which may have gaps from deleted modules
        modules = Module.objects.filter(section=instance.pk).order_by('position')
        for i, module in enumerate(modules):
            if module.position != i:
                module.position = i
                module.save()

    def render_change_form(self, request, context, **kwargs):
        inline_admin_formsets = context.get('inline_admin_formsets') or []
        submitted_formsets = {}
        for inline_admin_formset in inline_admin_formsets:
            submitted_formsets.update(
                getattr(inline_admin_formset, 'submitted_formsets', None) or {})

        for prefix, formset in submitted_formsets.iteritems():
            for form in formset.forms:
                if form.errors:
                    form.data[form.add_prefix('form_errors')] = (
                        "%s" % AdminErrorList(form, []).as_ul())

        return super(HomepageSectionAdmin, self).render_change_form(request, context, **kwargs)


admin.site.register(HomepageSection, HomepageSectionAdmin)
admin.site.register(Item, HomepageItemAdmin)
