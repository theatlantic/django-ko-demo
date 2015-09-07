# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import curation.fields
import cropduster.fields


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='Item',
            fields=[
                ('primary_id', models.AutoField(serialize=False, primary_key=True, db_column=b'id')),
                ('position', models.PositiveSmallIntegerField(verbose_name=b'Position')),
                ('date_modified', models.DateTimeField(auto_now=True)),
                ('source', models.CharField(max_length=8, null=True, blank=True)),
                ('object_id', models.PositiveIntegerField(null=True, verbose_name=b'Id', blank=True)),
                ('image', cropduster.fields.CropDusterImageField(db_column=b'image', default=b'', editable=False, upload_to=b'img/curation/homepage/%Y_%m', blank=True)),
                ('custom_title', models.CharField(max_length=255, null=True, db_column=b'title', blank=True)),
                ('custom_dek', models.CharField(max_length=2500, null=True, db_column=b'dek', blank=True)),
                ('custom_byline', models.CharField(max_length=255, null=True, db_column=b'byline', blank=True)),
                ('url', models.URLField(max_length=500, null=True, verbose_name=b'URL', blank=True)),
                ('content_type', curation.fields.ContentTypeSourceField(choices=[({b'class': 'curated-content-type-option', b'value': 1}, b'Magazine Article'), ({b'data-field-name': b'url', b'class': 'curated-content-type-option curated-content-type-ptr', b'value': 2}, b'URL')], to='contenttypes.ContentType', blank=True, null=True)),
            ],
            options={
                'ordering': ('position',),
            },
        ),
        migrations.CreateModel(
            name='Module',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('position', models.PositiveIntegerField()),
                ('layout', models.CharField(max_length=24, choices=[(b'stash', b'Stash'), (b'hero', b'Hero'), (b'hero-ramp', b'Hero Ramp'), (b'more-news', b'More News'), (b'single-third', '\u2153 thumb, \u2154 text'), (b'single-two-thirds', '\u2154 image, \u2153 text'), (b'single-half', 'half image, half text'), (b'collection-2', '2 articles with thumbs'), (b'collection-5', b'3 cols: 2 articles, 1 related col'), (b'pullquote-module', b'Pullquote')])),
                ('title_text', models.CharField(default=b'', max_length=128, blank=True)),
                ('title_url', models.URLField(default=b'', max_length=255, blank=True)),
            ],
            options={
                'ordering': ('position',),
            },
        ),
        migrations.CreateModel(
            name='Section',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=128)),
                ('slug', models.SlugField(unique=True)),
            ],
        ),
        migrations.AddField(
            model_name='module',
            name='section',
            field=models.ForeignKey(to='curation_nouveau.Section'),
        ),
        migrations.AddField(
            model_name='item',
            name='module',
            field=models.ForeignKey(blank=True, to='curation_nouveau.Module', null=True),
        ),
        migrations.CreateModel(
            name='HomepageSection',
            fields=[
            ],
            options={
                'verbose_name': 'Homepage',
                'proxy': True,
                'verbose_name_plural': 'Homepage',
            },
            bases=('curation_nouveau.section',),
        ),
    ]
