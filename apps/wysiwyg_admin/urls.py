from django.conf import settings
from django.conf.urls import include, url, patterns
from django.conf.urls.static import static
from django.contrib import admin


admin.autodiscover()


urlpatterns = [
    url(r'^admin/grappelli/', include('grappelli.urls')),
    url(r'^admin/_curation/', include('curation.urls')),
    url(r'^admin/_nested_admin/', include('nested_admin.urls')),
    url(r'^admin/cropduster/', include('cropduster.urls')),
    url(r'^admin/ckeditor/', include('ckeditor.urls')),
    url(r'^admin/', include(admin.site.urls)),
] +  static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += patterns('django.contrib.staticfiles.views',
        url(r'^static/(?P<path>.*)$', 'serve'))
