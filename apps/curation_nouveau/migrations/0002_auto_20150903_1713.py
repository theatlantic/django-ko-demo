# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def create_stash_module(apps, schema_editor):
    Module = apps.get_model("curation_nouveau", "Module")
    Section = apps.get_model("curation_nouveau", "Section")

    hp_section, _ = Section.objects.get_or_create(slug='homepage', defaults={"name": "Homepage"})

    Module.objects.create(position=0, layout='stash', section=hp_section)


class Migration(migrations.Migration):

    dependencies = [
        ('curation_nouveau', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_stash_module),
    ]
