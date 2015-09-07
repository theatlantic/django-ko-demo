from django.db import models
from ckeditor.fields import RichCharField


class MagArticle(models.Model):

    date_published = models.DateTimeField("Publication date",
        blank=True, null=True, db_index=True)
    title = models.CharField(max_length=255)
    dek = RichCharField(max_length=2500, blank=True, null=True,
        config_name='inline_styles')
    url = models.URLField(blank=True)

    class Meta:
        ordering = ['-date_published']

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return self.url
