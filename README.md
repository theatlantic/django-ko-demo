This is a rough demo of the techniques discussed in my DjangoCon US 2015 talk
“[Building theatlantic.com homepage’s WYSIWYG admin with Django and Knockout](https://2015.djangocon.us/schedule/presentation/80/).”

To get started, clone the repo and run `./setup.sh` from the root directory, then activate the virtualenv and execute the following commands:

```
python apps/manage.py syncdb
python apps/manage.py runserver
```

Files of interest in this repository (all situated within the folder [apps/curation_nouveau](https://github.com/fdintino/wysiwyg-admin/tree/master/apps/curation_nouveau)):

<dl>
<dt><a href="https://github.com/theatlantic/django-ko-demo/blob/master/apps/curation_nouveau/static/curation_nouveau/js/homepage.js">static/curation_nouveau/js/homepage.js</a></dt>
<dd>The file that iterates over the fields and builds and initializes the knockout models.</dd>
<dt><a href="https://github.com/theatlantic/django-ko-demo/blob/master/apps/curation_nouveau/static/curation_nouveau/js/homepage-models.js">static/curation_nouveau/js/homepage-models.js</a></dt>
<dd>The knockout viewmodel classes</dd>
<dt><a href="https://github.com/theatlantic/django-ko-demo/blob/master/apps/curation_nouveau/templates/admin/curation_nouveau/homepagesection/change_form.html">templates/admin/curation_nouveau/homepagesection/change_form.html</a></dt>
<dd>The django template containing the knockout template markup.</dd>
</dl>