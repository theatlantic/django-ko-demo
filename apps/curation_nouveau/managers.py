"""
Example usage:

class HomepageSection(Section):

    section_slug = 'homepage'
    section_name = 'Homepage'

    objects = ProxySectionManager()

    class Meta:
        proxy = True


section = HomepageSection.objects.get()

"""
import django
from django.db import models

try:
    from django.db.models.lookups import Exact
except ImportError:
    class Exact(object): pass


class ProxySectionQuerySet(models.query.QuerySet):

    def _get_or_create_proxy_model_instance(self):
        """
        get_or_create the concrete model, get the serialized form (intended for
        pickle), swap out the model, and create the same instance as the proxy
        class.

        We can't just use the proxy model's get_or_create() because it would
        recurse infinitely.
        """
        obj = self.model._meta.concrete_model.objects.get_or_create(
            name=self.model.section_name, slug=self.model.section_slug)[0]
        unpickler, (concrete_model, deferred_attrs, factory), data = obj.__reduce__()
        proxy_obj = unpickler(self.model, deferred_attrs, factory)
        proxy_obj.__dict__.update(data)
        return proxy_obj

    def _is_valid_cached_queryset(self):
        """
        Checks that the queryset doesn't filter on columns other than `slug`
        or `name`, and that if it is filtering by those values they are the
        expected ones. This ensures that

            ProxySectionModel.objects.filter(slug='wrong_slug')

        doesn't return any results.
        """
        if not self.query or not getattr(self.query, 'where', None):
            return False
        if self.query.extra:
            return False
        where_children = self.query.where.children
        for where_node in where_children:
            if isinstance(where_node, Exact):
                col_obj = getattr(where_node.lhs, 'source', getattr(where_node.lhs, 'output_field', None))
                col = col_obj.name
                value = where_node.rhs
                if col not in ('slug', 'name'):
                    return False
                elif col == 'slug' and value != self.model.section_slug:
                    return False
                elif col == 'name' and value != self.models.section_name:
                    return False
            else:
                for child in getattr(where_node, 'children', [where_node]):
                    constraint, lookup_type, value_annotation, value = child
                    if constraint.col not in ('slug', 'name'):
                        return False
                    elif constraint.col == 'slug' and value != self.model.section_slug:
                        return False
                    elif constraint.col == 'name' and value != self.model.section_name:
                        return False
        return True

    def __len__(self):
        """
        Surreptitiously insert our "singleton" instance into the result cache.
        """
        if not self._is_valid_cached_queryset():
            return super(ProxySectionQuerySet, self).__len__()
        if not self._result_cache:
            self._result_cache = [self._get_or_create_proxy_model_instance()]
            self._iter = None
        return super(ProxySectionQuerySet, self).__len__()

    def _fill_cache(self, num=None):
        """
        Surreptitiously insert our "singleton" instance into the result cache.
        """
        if not self._is_valid_cached_queryset():
            return super(ProxySectionQuerySet, self)._fill_cache()
        self._iter = None
        self._result_cache = [self._get_or_create_proxy_model_instance()]


class ProxySectionManager(models.Manager):

    def get_queryset(self):
        qset = ProxySectionQuerySet(self.model, using=self._db)
        return qset.filter(slug=self.model.section_slug)

    if django.VERSION < (1, 7):
        get_query_set = get_queryset
