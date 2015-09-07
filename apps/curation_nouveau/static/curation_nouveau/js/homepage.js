(function($) {

    // Some optimizations: disable django-nested-admin and
    // django-curation functionality we won't be using.
    DJNesting._updatePositions = DJNesting.updatePositions;
    DJNesting.updatePositions = function() {};

    delete $.fn.curated_content_type;

    function getAngularExpression($input) {
        var name = $input.attr('name');
        // We don't have a need to bind these inputs
        if (!name || name.match(/\-empty/) || name.match(/\-(clear|thumbs)$/)) {
            return;
        }
        if (name.match(/\-__prefix__\-/)) {
            name = name.replace(/\-__prefix__\-/g, '__tmpl.');
        }

        var expr = name.replace(/\-(\d+)\-/g, '[$1].');

        // Management form fields are a special case, by our own convention
        // we change the property to %(old_prop)s__mgmt
        expr = expr.replace(/\-(TOTAL_FORMS|MIN_NUM_FORMS|MAX_NUM_FORMS|INITIAL_FORMS)/, '__mgmt.$1');

        // Cropduster does some magic where it is both an ImageField and an inline,
        // with the same prefix. So we map the ImageField to the equivalent field
        // within the inline
        if (typeof $input == 'object' && $input.hasClass('cropduster-data-field')) {
            expr += '[0].image';
        }
        expr = expr.replace(/\.$/, '');
        return expr;
    }

    function parseFields() {
        var scope = {};
        $('input,textarea,select').each(function(i, el) {
            var $el = $(el);
            var expr = getAngularExpression($el);
            if (!expr) {
                return;
            }
            var val;
            if ($el.is('[type="checkbox"]')) {
                val = $el.is(':checked');
            } else {
                val = $el.val();
            }
            if ($.isNumeric(val) && expr.match(/\.position$/)) {
                val = parseInt(val, 10);
            }
            var expression = Expressions.compile(expr);
            if (!expression || !expression.assign) {
                return;
            }
            expression.assign(scope, val);
        });

        if (!scope.module_set) {
            scope.module_set = [];
        }
        for (var i = 0; i < scope.module_set.length; i++) {
            var module = scope.module_set[i];
            if (typeof module.item_set == 'undefined') {
                module.item_set = [];
            }
        }

        return scope;
    }

    function addBindings($root) {
        if (typeof $root == 'undefined') {
            $root = $('body');
        }
        $root.find('input,textarea,select').each(function(i, el) {
            var $el = $(el);
            var name = $el.attr('name');
            if (name && name.match(/\-__prefix__\-/)) {
                return;
            }
            var expr = getAngularExpression($el);
            if (!expr) {
                return;
            }
            // Turn into a knockout binding expression
            var bindExpression = expr.replace(/\[/g, '()[');

            var bindType;
            if ($el.is('textarea')) {
                bindType = 'html';
            } else if ($el.is('input[type="checkbox"]') || $el.is('input[type="radio"]')) {
                bindType = 'checked';
            } else {
                bindType = 'value';
            }
            $el.attr('data-bind', bindType + ': ' + bindExpression);
        });
    }

    // We keep a queue of form inputs that have changed or are newly added,
    // and apply them when certain events are fired (rather than synchronously)
    // for performance reasons.
    var formsNeedingBindingsApplied = [];
    var viewModel;
    var bindingsInitialized = false;
    var bindingsRecalculating = false;

    $(document).on('djnesting:attrchange', function(event, $inline, $form) {
        ko.cleanNode($form[0].parentNode);
        $form.find('[data-bind]').removeAttr('data-bind');
        addBindings($form);
        formsNeedingBindingsApplied.push($form[0]);
    });

    $(document).on('djnesting:added', function(event, $inline, $form) {
        ko.cleanNode($form[0].parentNode);
        $form.find('[data-bind]').removeAttr('data-bind');
        addBindings($form);
        formsNeedingBindingsApplied.push($form[0]);
        setTimeout(function() {
            $(document).trigger('curation_nouveau:mutate');
        }, 0);
    });

    $(document).on('curation_nouveau:mutate cropduster:update', function() {
        if (!bindingsInitialized) {
            return;
        }
        if (bindingsRecalculating) {
            setTimeout(function() {
                $(document).trigger('curation_nouveau:mutate', $.makeArray(arguments));
            }, 100);
            return;
        }
        bindingsRecalculating = true;
        var data = parseFields();
        ko.mapping.fromJS(data, viewModel);

        var seenFormIds = {};

        while(formsNeedingBindingsApplied.length) {
            var form = formsNeedingBindingsApplied.shift();
            var formId = form.getAttribute('id');
            if (seenFormIds[formId]) {
                continue;
            }
            seenFormIds[formId] = 1;
            ko.applyBindings(viewModel, form);
        }

        bindingsRecalculating = false;
    });

    $(document).on('curation_nouveau:flush_pending_bindings', function() {
        if (!bindingsInitialized) {
            return;
        }
        if (bindingsRecalculating) {
            setTimeout(function() {
                $(document).trigger('curation_nouveau:flush_pending_bindings', $.makeArray(arguments));
            }, 100);
            return;
        }
        bindingsRecalculating = true;

        var seenFormIds = {};

        while(formsNeedingBindingsApplied.length) {
            var form = formsNeedingBindingsApplied.shift();
            var formId = form.getAttribute('id');
            if (seenFormIds[formId]) {
                continue;
            }
            seenFormIds[formId] = 1;

            ko.applyBindings(viewModel, form);
        }

        bindingsRecalculating = false;
    });

    $(document).on('curation_nouveau:updatedata', function() {
        ko.mapping.fromJS(parseFields(), viewModel);
    });

    $(document).ready(function() {

        bindingsRecalculating = true;
        var data = parseFields();
        addBindings();
        viewModel = ko.mapping.fromJS(data, {
            module_set: {
                key: function(data) {
                    var key = ko.unwrap(data.module_ptr);
                    return (key) ? key : '_' + ko.unwrap(data.position);
                },
                create: function(options) {
                    var module = new HomepageModels.HomepageModule(options.data);
                    module.parent = function() {
                        return viewModel;
                    };
                    return module;
                }
            }
        });
        // Add a convenience method we'll use in the template
        viewModel.module_set.sortByPosition = function() {
            return this.slice().sort(function(a, b) {
                var a_pos = parseInt(a.position(), 10) || 0,
                    b_pos = parseInt(b.position(), 10) || 0;
                return (a_pos == b_pos) ? 0 : ((a_pos < b_pos) ? -1 : 1);
            });
        };

        ko.applyBindings(viewModel);
        bindingsRecalculating = false;
        bindingsInitialized = true;

        // Initialize the slide animation for the "Stash"
        $('.stash-link').bigSlide({
            side: 'left',
            menuWidth: '20%',
            menu: '#homepage-stash',
            easyClose: false
        });

        $('form').off('submit.djnesting').on('submit', function() {
            if (CKEDITOR.currentInstance) {
                CKEDITOR.currentInstance.focusManager.blur(true);
            }
            ko.tasks.runEarly();
            var $form = $(this);
            ko.cleanNode($form[0].parentNode);
            $form.find('[data-bind]').removeAttr('data-bind');
            $('.djnesting-stacked').each(function() {
                DJNesting.updatePositions($(this).djangoFormsetPrefix(), true);
            });
        });

    });

    // This gets triggered after HomepageItemAdmin.response_add()
    window.onArticleAdd = function(win, newId, article) {
        $(document).trigger('articleadd', [newId, article]);
    };

})(django.jQuery);
