from __future__ import division

from django.contrib.contenttypes.models import ContentType
from django.utils import datetime_safe as datetime

from cropduster.resizing import Crop
from cropduster.models import Image, Thumb
from cropduster.utils import get_min_size


class ImageImportError(Exception):
    pass


def crop_overlap(c1, c2):
    b1, b2 = c1.box, c2.box
    area_1 = float(b1.w * b1.h)

    x1 = max(b1.x1, b2.x1)
    x2 = min(b1.x2, b2.x2)
    y1 = max(b1.y1, b2.y1)
    y2 = min(b1.y2, b2.y2)
    if x1 >= x2 or y1 >= y2:
        return 0.0

    intersection_area = float(x2 - x1) * float(y2 - y1)

    return intersection_area / area_1


def import_from_cropduster_field_file(item, field, image_field_file, commit=True):
    cropduster_image = image_field_file.related_object
    original_image_path = image_field_file.path

    sizes = getattr(item, field).sizes

    required_w, required_h = get_min_size(sizes)
    if cropduster_image.width < required_w or cropduster_image.height < required_h:
        raise ImageImportError("article image is not large enough")

    setattr(item, field, image_field_file.name)

    new_image = Image.objects.create(
        content_type=ContentType.objects.get_for_model(item),
        object_id=item.pk,
        field_identifier=item._meta.get_field(field).field_identifier,
        width=cropduster_image.width,
        height=cropduster_image.height,
        image=image_field_file.name,
        attribution=cropduster_image.attribution,
        attribution_link=cropduster_image.attribution_link,
        caption=cropduster_image.caption)

    getattr(item, field).related_object = new_image

    for size in sizes:
        existing_thumbs = cropduster_image.thumbs.filter(reference_thumb__isnull=True)
        existing_crops = [Crop(t.get_crop_box(), original_image_path) for t in existing_thumbs]
        existing_crops.sort(key=lambda c: crop_overlap(size.fit_to_crop(c), c))
        best_crop = existing_crops[-1]
        new_crop = size.fit_to_crop(best_crop)
        new_thumb = Thumb(
            name=size.name,
            width=size.width,
            height=size.height,
            crop_x=new_crop.box.x1,
            crop_y=new_crop.box.y1,
            crop_w=new_crop.box.w,
            crop_h=new_crop.box.h,
            image=new_image)
        new_thumbs = new_image.save_size(size, new_thumb)
        for thumb_name, thumb in new_thumbs.iteritems():
            thumb.image = new_image
            thumb.save()

    if commit:
        item.save()


def import_existing_image(item, field='custom_image'):
    if not item.content_object:
        raise ImageImportError("item does not point to an article")
    if not item.content_object.lead_image or not item.content_object.lead_image.related_object:
        raise ImageImportError("article does not have an image")

    image_field_file = item.content_object.lead_image
    import_from_cropduster_field_file(item, field, image_field_file)


def wrap_in_link(obj):
    if hasattr(obj, 'get_absolute_url'):
        return '<a href="%s">%s</a>' % (obj.get_absolute_url(), obj)
    else:
        return unicode(obj)


def humanize_list(value, callback=wrap_in_link, conjunction='and', oxford_comma=True):
    """
    Turns an interable list into a human readable string.

    >>> list = ['First', 'Second', 'Third', 'fourth']
    >>> humanize_list(list)
    u'First, Second, Third, and fourth'
    >>> humanize_list(list, conjunction='or')
    u'First, Second, Third, or fourth'
    """

    num = len(value)

    if num == 0:
        return ""
    elif num == 1:
        return callback(value[0])

    s = u", ".join( map(callback, value[:num-1]) )

    if len(value) >= 3 and oxford_comma is True:
        s += ","

    return "%s %s %s" % (s, conjunction, callback(value[num-1]))


def naturaldatetime(dt):
    if not dt:
        return

    # Python 2's strftime does not operate on dates before 1900 so we need to
    # cast `dt` into django's datetime_safe type.
    dt = datetime.new_datetime(dt)

    day = datetime.date(
            dt.year,
            dt.month,
            dt.day
    )
    delta = day - datetime.date.today()

    if delta.days == 0:  # today
        return dt.strftime('%-I:%M %p ET')
    else:
        return dt.strftime('%b %-d, %Y')
