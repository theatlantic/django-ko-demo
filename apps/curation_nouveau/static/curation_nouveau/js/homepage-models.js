(function(factory) {
    if (typeof define === "function" && define.amd) {
        // AMD anonymous module
        define(['knockout', 'jquery', 'bootstrap-dialog', 'exports'], factory);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS module
        var ko = require("knockout"),
            jQuery = require("jquery"),
            BootstrapDialog = require('bootstrap-dialog');
        factory(ko, jQuery, BootstrapDialog, module.exports || exports);
    } else {
        // No module loader (plain <script> tag) - put directly in global namespace
        factory(window.ko, window.grp.jQuery, window.BootstrapDialog, window.HomepageModels = {});
    }
})(function(ko, $, BootstrapDialog, exports) {

    ko.options.deferUpdates = true;

    function HomepageItem(data) {
        this.dropTargets = ko.observableArray();
        if (typeof data.DELETE == 'undefined') {
            data.DELETE = false;
        }
        ko.mapping.fromJS(data, {}, this);
    }
    $.extend(HomepageItem.prototype, {
        isEmpty: function() {
            return !this.content_type();
        },
        populateWithArticle: function() {
            var self = this;
            var $form = this.$djangoForm();
            var prefix = $form.djangoFormPrefix();
            var module = self.parent();
            var iframe = '<iframe src="" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" ' +
                         ' width="660" height="350" scrolling="no"></iframe>';
            BootstrapDialog.show({
                title: 'Add an article',
                message: iframe,
                onshow: function() {
                    var $modal = this.getModal();
                    $modal.find('iframe').attr('src', '/admin/curation_nouveau/item/add/?_popup=3');
                    $(document).one('articleadd', function(e, newId, article) {
                        $(document).trigger('curation_nouveau:operationstart');
                        $modal.modal('hide');
                        $form.attr('data-is-initial', 'true').addClass('has_original').data('isInitial', true);
                        var keys = Object.keys(article);
                        keys.sort();
                        keys.forEach(function(k) {
                            var v = article[k];
                            if (k.match(/\-thumbs$/) && $.isArray(v)) {
                                var $select = $('#id_' + prefix + k);
                                $.each(v, function(i, thumb) {
                                    var option = '<option value="' + thumb.id + '" selected="selected" ' +
                                                 '        data-width="' + thumb.width +'"' +
                                                 '        data-height="' + thumb.height + '"' +
                                                 '        data-tmp-file="false">' + thumb.name + '</option>';
                                    $select.append($(option));
                                });
                            } else {
                                $('#id_' + prefix + k).val(v);
                            }
                            $('#id_' + prefix + k).trigger('change');
                        });
                        var initial_forms = module.djangoFormset().mgmtVal('INITIAL_FORMS');
                        if (module.isInitial()) {
                            module.djangoFormset().mgmtVal('INITIAL_FORMS', initial_forms + 1);
                            module.item_set__mgmt.INITIAL_FORMS(initial_forms + 1);
                        }
                        $(document).trigger('curation_nouveau:updatedata');
                        $(document).trigger('curation_nouveau:operationend');
                    });
                },
                onhide: function() {
                    $(document).off('articleadd');
                }
            });
        },
        parent: function() {
            return this._parent;
        },
        $djangoForm: function() {
            var prefix = this.parentDjangoFormset().prefix;
            var index = this.parent().item_set.indexOf(this);
            return $('#' + prefix + index);
        },
        $djangoFormsetEl: function() {
            return this.$djangoForm().children('.djnesting-stacked');
        },
        djangoFormset: function() {
            return this.$djangoFormsetEl().djangoFormset();
        },
        $parentDjangoFormsetEl: function() {
            return this.parent().$djangoFormsetEl();
        },
        parentDjangoFormset: function() {
            return this.parent().djangoFormset();
        },
        remove: function() {
            $(document).trigger('curation_nouveau:operationstart');
            var position = this.position();
            var isInitial = this.$djangoForm().data('isInitial');
            var index = this.parent().item_set.indexOf(this);
            this.parentDjangoFormset().remove(this.$djangoForm());
            this.parent().item_set.replace(this, null);
            this.parent()._fillGap(index, isInitial);
            this.parent().item_set.remove(null);
            this.parent().item_set().forEach(function(item) {
                if (item.position() > position) {
                    item.position(item.position() - 1);
                }
            });
            this.parent().item_set__mgmt.TOTAL_FORMS(this.parentDjangoFormset().mgmtVal('TOTAL_FORMS'));
            this.parent().item_set__mgmt.INITIAL_FORMS(this.parentDjangoFormset().mgmtVal('INITIAL_FORMS'));
            ko.tasks.runEarly();
            $(document).trigger('curation_nouveau:operationend');
        },
        toggleDelete: function() {
            var stashPrefix = 'module_set-0-item_set';
            var $stashFormset = $('#' + stashPrefix + '-group');
            var stashDjangoFormset = $stashFormset.djangoFormset();
            var parentDjangoFormset = this.parentDjangoFormset();
            var $stashedForm;
            $(document).trigger('curation_nouveau:operationstart');
            if (parentDjangoFormset.prefix == stashPrefix) {
                $stashedForm = this.$djangoForm();
            } else {
                var stashFormLength = $stashFormset.djangoFormsetForms().length;
                this._stash(true);
                $stashedForm = $stashFormset.djangoFormsetForms().eq(stashFormLength);
            }
            if (!this.DELETE()) {
                stashDjangoFormset.delete($stashedForm);
                this.DELETE(true);
            } else {
                stashDjangoFormset.undelete($stashedForm);
                this.DELETE(false);
            }
            ko.tasks.runEarly();
            $(document).trigger('curation_nouveau:operationend');
        },
        stash: function() {
            $(document).trigger('curation_nouveau:operationstart');
            this._stash();
            ko.tasks.runEarly();
            $(document).trigger('curation_nouveau:operationend');
        },
        _stash: function(isDelete) {
            ko.tasks.runEarly();
            var stashDjangoFormset = $('#module_set-0-item_set-group').djangoFormset();
            var parentDjangoFormset = this.parentDjangoFormset();
            var position = this.position();
            var currentModule = this.parent();
            var stashModule = currentModule.parent().module_set()[0];
            var stashPosition = (isDelete) ? stashModule.item_set().length : 0;
            var $djangoForm = this.$djangoForm();
            $(document).trigger('djnesting:attrchange', [null, $djangoForm]);
            this.spliceInto(stashModule, stashPosition, $djangoForm.data('isInitial'));
            stashDjangoFormset.spliceInto($djangoForm, stashPosition);
            stashModule.item_set__mgmt.INITIAL_FORMS(stashDjangoFormset.mgmtVal('INITIAL_FORMS'));
            stashModule.item_set__mgmt.TOTAL_FORMS(stashDjangoFormset.mgmtVal('TOTAL_FORMS'));
            currentModule.item_set__mgmt.INITIAL_FORMS(parentDjangoFormset.mgmtVal('INITIAL_FORMS'));
            currentModule.item_set__mgmt.TOTAL_FORMS(parentDjangoFormset.mgmtVal('TOTAL_FORMS'));
            ko.tasks.runEarly();
            $(document).trigger('curation_nouveau:flush_pending_bindings');
            currentModule.addBlankItem(position);
            parentDjangoFormset.add();
            ko.tasks.runEarly();
            $(document).trigger('curation_nouveau:flush_pending_bindings');
        },
        spliceInto: function(newModule, position, isInitial) {
            var self = this;
            ko.tasks.schedule(function() {
                var currentModule = self.parent();
                var item = self;
                var oldPosition = self.position();
                var index = currentModule.item_set.indexOf(item);
                currentModule.item_set.splice(index, 1, null);
                currentModule._fillGap(index, isInitial);
                currentModule.item_set.remove(null);

                currentModule.item_set().forEach(function(i) {
                    if (i.position() > oldPosition) {
                        i.position(i.position() - 1);
                    }
                });

                var itemMovedToEnd;

                if (isInitial && !newModule.id()) {
                    item.module('');
                    isInitial = false;
                }

                if (isInitial && newModule.id()) {
                    var initialFormCount = 0, totalFormCount = 0;
                    item.module(newModule.id());
                    newModule.item_set().forEach(function(i) {
                        if (i && i.primary_id()) {
                            initialFormCount++;
                        }
                        totalFormCount++;
                    });
                    if (totalFormCount > initialFormCount) {
                        itemMovedToEnd = newModule.item_set()[initialFormCount];
                        newModule.item_set.replace(itemMovedToEnd, item);
                        newModule.item_set.push(itemMovedToEnd);
                    }
                }
                if (!itemMovedToEnd) {
                    newModule.item_set.push(item);
                }
                item.position(position);
                item._parent = newModule;
                newModule.item_set().forEach(function(i) {
                    if (i == item) {
                        return;
                    }
                    if (i.position() >= position) {
                        i.position(i.position() + 1);
                    }
                });
            });
            ko.tasks.runEarly();
        },
        thumbUrl: function(sizeName, retinaSizeName) {
            var fieldName = 'image';
            var original = this.image()[0].image();
            if (!original) { return; }

            var prefix = this.$djangoForm().djangoFormPrefix();
            var mediaUrl = $('#' + prefix + fieldName + '-group').data('mediaUrl');
            var $thumbsSelect = $('#id_' + prefix + fieldName + '-0-thumbs');
            var $thumbOption = $thumbsSelect.find('option').filter(function(i, el) { return el.innerHTML == sizeName; });

            if (sizeName != 'original' && !$thumbOption.length) {
                return;
            }

            var hasRetina = false;
            if (retinaSizeName) {
                var $retinaThumbOption = $thumbsSelect.find('option').filter(function(i, el) { return el.innerHTML == retinaSizeName; });
                hasRetina = !!($retinaThumbOption.length);
            }
            var isTmp = $thumbOption.data('tmpFile');

            // The groups in this regex correspond to the path, basename (sans
            // extension), and file extension of a file path or url.
            var matches = original.match(/^(.*)(\/(?:[^\/](?!\.[^\.\/\?]+))*[^\.\/\?])(\.[^\.\/\?]+)?$/);
            if (!matches) {
                return;
            }
            if (isTmp) {
                sizeName += '_tmp';
                if (retinaSizeName) { retinaSizeName += '_tmp'; }
            }
            var path = matches[1], ext = matches[3];

            if ($thumbOption.length) {
                ext += '?id=' + $thumbOption.val();
            }

            var srcset = [mediaUrl + path, sizeName + ext].join('/');
            if (hasRetina) {
                srcset += ' 1x, ' + [mediaUrl + path, retinaSizeName + ext].join('/') + ' 2x';
            }
            return srcset;
        },
        editImage: function() {
            var imageFieldName = 'image',
                $targetInput = this.$djangoForm().djangoFormField(imageFieldName),
                inputData = $targetInput.data(),
                $uploadButton = $targetInput.parent().find('.cropduster-upload-form');
            var cropdusterUrl = $uploadButton.data('cropdusterUrl');
            var arg = (cropdusterUrl.indexOf('?') >= 0) ? '&' : '?';
            if (inputData.uploadTo) {
                cropdusterUrl += arg + 'upload_to=' + encodeURI(inputData.uploadTo);
            }
            CropDuster.show($targetInput.attr('name'), cropdusterUrl);
        },
        droppableOptions: function() {
            return {
                group: {
                    name: 'stash'
                },
                filter: '.deleted'
            };
        }
    });

    var sortableCounter = 0;

    function HomepageModule(data) {
        if (typeof data.DELETE == 'undefined') {
            data.DELETE = false;
        }
        ko.mapping.fromJS(data, {
            item_set: {
                create: function(options) {
                    var item = new HomepageItem(options.data);
                    item._parent = options.parent;
                    return item;
                },
                key: function(data) {
                    var key = ko.unwrap(data.primary_id);
                    return (key) ? key : '_' + ko.unwrap(data.position);
                }
            }
        }, this);
        this.item_set.sortByPosition = function() {
            return this.slice().sort(function(a, b) {
                var a_pos = parseInt(a.position(), 10) || 0,
                    b_pos = parseInt(b.position(), 10) || 0;
                return (a_pos == b_pos) ? 0 : ((a_pos < b_pos) ? -1 : 1);
            });
        };
        // Clone this.item_set, so that we can prevent bugs on articles
        // that were initially part of modules that are being deleted.
        this._original_item_set = this.item_set.slice();
    }
    $.extend(HomepageModule.prototype, {
        maxItems: function maxItems() {
            switch (this.layout()) {
                case 'stash':
                    return Infinity;
                case 'collection-2':
                case 'video-module':
                    return 2;
                case 'collection-5':
                    return 5;
                case 'more-news':
                    return 4;
            }
            return 1;
        },
        _fillGap: function(index, isInitial) {
            var initialItem, newItem;

            if (this.item_set().length <= index) {
                return;
            }
            if (this.item_set()[index] !== null) {
                return;
            }

            this.item_set().forEach(function(item, i) {
                if (!item || i <= index) {
                    return;
                }
                if (item.$djangoForm().data('isInitial')) {
                    initialItem = item;
                } else {
                    newItem = item;
                }
            });
            var item = (isInitial) ? initialItem || newItem : newItem;
            if (!item) {
                return;
            }
            var $itemDjangoForm = item.$djangoForm();
            if ($itemDjangoForm.length) {
                $(document).trigger('djnesting:attrchange', [null, $itemDjangoForm]);
            }
            var oldIndex = this.item_set().indexOf(item);

            this.item_set.splice(oldIndex, 1, null);
            this.item_set.splice(index, 1, item);

            if (isInitial && initialItem && newItem) {
                this._fillGap(oldIndex, false);
            }
        },
        /**
         * If a placeholder should be inserted before the module,
         * returns the type of placeholder. Either 'ad', 'promo',
         * or 'most-popular'
         */
        placeholderToInsert: function(editPosition) {
            if (editPosition === undefined) {
                editPosition = this.editPosition();
            }
            if (editPosition == this.editPosition() && this.DELETE()) {
                return;
            }
            if (this.nextPositionIsDeleted(editPosition)) {
                return;
            }
            if (this.editPosition() == 7) {
                return 'most-popular';
            }
            if (editPosition % 4 == 1) {
                return 'ad';
            }
            if (editPosition % 4 == 3) {
                return 'promo';
            }
        },
        nextPositionIsDeleted: function(editPosition) {
            var currentEditPosition, currentPosition, nextModule;
            if (editPosition === undefined) {
                currentEditPosition = this.editPosition();
                currentPosition = this.position();
            } else {
                currentEditPosition = editPosition;
                this.parent().module_set().forEach(function(module) {
                    if (!module.DELETE() && module.editPosition() == currentEditPosition) {
                        currentPosition = module.position();
                    }
                });
            }
            if (currentPosition === undefined) {
                return false;
            }
            this.parent().module_set().forEach(function(module) {
                if (module.position() === currentPosition + 1) {
                    nextModule = module;
                }
            });
            if (nextModule) {
                return nextModule.DELETE();
            }
            return false;
        },
        className: function() {
            return 'homepage-module editable-module ' + this.layout();
        },
        /**
         * The position of the module in relation to all preceding edit modules.
         * This has special logic because the most popular module (in slot 7) is
         * injected as a placeholder and is not a "real" module here.
         */
        editPosition: function(realPosition) {
            if (typeof realPosition == 'undefined') {
                realPosition = this.realPosition();
            }
            var editPosition = realPosition;
            if (editPosition >= 6) {
                editPosition++;
            }
            return editPosition;
        },
        allowDrop: function() {
            return this.maxItems() > this.item_set().length;
        },
        sortableIsEnabled: function() {
            return true;
        },
        undeletedItemCount: function() {
            return this.item_set().filter(function(item) { return !item.DELETE(); }).length;
        },
        toggleDelete: function() {
            var self = this;
            if (!this.isInitial()) {
                return this.remove();
            }
            $(document).trigger('curation_nouveau:operationstart');

            var action = (this.DELETE()) ? 'undelete' : 'delete';

            this.parentDjangoFormset()[action](this.$djangoForm());

            if (action == 'delete') {
                var items = this.item_set.slice();
                items.reverse();
                items.forEach(function(item) {
                    if (item.isEmpty()) {
                        item.remove();
                    } else {
                        item.DELETE(true);
                    }
                });
                this._original_item_set.forEach(function(item) {
                    if (item.parent() != self) {
                        item.image__mgmt.INITIAL_FORMS(0);
                    }
                });
            } else if (action == 'undelete') {
                this.item_set().forEach(function(item) {
                    item.DELETE(false);
                });
                for (var i = this.item_set().length; i < this.maxItems(); i++) {
                    this.addBlankItem();
                    this.djangoFormset().add();
                    $(document).trigger('curation_nouveau:flush_pending_bindings');
                }
            }
            this.DELETE((action == 'delete'));

            ko.tasks.runEarly();
            $(document).trigger('curation_nouveau:operationend');
        },
        remove: function() {
            $(document).trigger('curation_nouveau:operationstart');
            var position = this.position();
            this.parentDjangoFormset().remove(this.$djangoForm());
            this.parent().module_set.remove(this);
            this.parent().module_set().forEach(function(module) {
                if (module.position() > position) {
                    module.position(module.position() - 1);
                }
            });
            ko.tasks.runEarly();
            $(document).trigger('curation_nouveau:operationend');
        },
        moveUp: function() {
            $(document).trigger('curation_nouveau:operationstart');
            var position = this.position();
            var previousModule;
            this.parentDjangoFormset().spliceInto(this.$djangoForm(), position - 1);
            this.parent().module_set().some(function(module) {
                if (module.position() == (position - 1)) {
                    previousModule = module;
                    return true;
                }
                return false;
            });
            if (previousModule) {
                this.position(position - 1);
                previousModule.position(position);
            }
            ko.tasks.runEarly();
            $(document).trigger('curation_nouveau:operationend');
        },
        moveDown: function() {
            $(document).trigger('curation_nouveau:operationstart');
            var position = this.position();
            var nextModule;
            this.parentDjangoFormset().spliceInto(this.$djangoForm(), position + 1);
            this.parent().module_set().some(function(module) {
                if (module.position() == (position + 1)) {
                    nextModule = module;
                    return true;
                }
                return false;
            });
            if (nextModule) {
                this.position(position + 1);
                nextModule.position(position);
            }
            ko.tasks.runEarly();
            $(document).trigger('curation_nouveau:operationend');
        },
        isInitial: function() {
            return !!this.id();
        },
        $djangoForm: function() {
            var index = this.parent().module_set.indexOf(this);
            return $('#module_set' + index);
        },
        $djangoFormsetEl: function() {
            return this.$djangoForm().children('.djnesting-stacked');
        },
        djangoFormset: function() {
            return this.$djangoFormsetEl().djangoFormset();
        },
        $parentDjangoFormsetEl: function() {
            return $('#module_set-group');
        },
        parentDjangoFormset: function() {
            return this.$parentDjangoFormsetEl().djangoFormset();
        },
        sortableBeforeMove: function(event) {
            var $item = $(event.item);
            var itemIsDroppable = $item.parent().is('.article-droppable');
            if (itemIsDroppable) {
                $item = $item.parent().parent();
            }
            var $newModule = $item.closest('.editable-module');

            event.newIndex = $item.prevAll('li.article').length;

            event.data.sourceModule = event.data.item.parent();
            event.data.sourceParent = event.data.item.parent().item_set;
            event.data.sourceIndex = event.data.sourceParent.indexOf(event.data.item);

            var newModule = ko.dataFor($newModule[0]);
            var itemToReplace = ko.dataFor($item[0]);
            event.data.realTargetIndex = event.data.targetIndex = itemToReplace.parent().item_set.indexOf(itemToReplace);
            event.data.targetParent = newModule.item_set;
            event.data.targetModule = newModule;
            event.data.targetModuleNode = $newModule[0];
            event.data.sourceModuleNode = event.from.parentNode;

            if (itemIsDroppable) {
                var oldPosition = itemToReplace.position();
                itemToReplace.remove();
                event.data.item.position(oldPosition);
            }
            // Prevent a meaningless splice operation from taking place,
            // since we need to manage that ourselves
            event.data.targetIndex = -1;
        },
        sortableOptions: function sortableOptions() {
            return {
                draggable: 'li.article',
                group: {
                    name: (this.layout() == 'stash') ? 'stash' : (this.layout() + '-' + (++sortableCounter)),
                    put: false
                },
                filter: '.deleted',
                onStart: function(event) {
                    $(event.from).addClass('drag-started');
                },
                onEnd: function onEnd(event) {
                    $(event.from).removeClass('drag-started');
                    $(document).trigger('curation_nouveau:operationstart');
                    if (event.newIndex === undefined) {
                        return;
                    }
                    var fromModule = event.from.parentNode,
                        targetModule = $(event.item).closest('.editable-module')[0];

                    if (fromModule == targetModule && event.oldIndex == event.newIndex) {
                        return;
                    }

                    var $oldForm = event.data.item.$djangoForm();
                    var newDjangoFormset = event.data.targetModule.djangoFormset();

                    var oldDjangoFormset = event.data.item.parentDjangoFormset();

                    var isInitial = $oldForm.data('isInitial');
                    newDjangoFormset.spliceInto($oldForm, event.newIndex);
                    event.data.item.spliceInto(event.data.targetModule, event.newIndex, isInitial);

                    event.data.sourceModule.item_set__mgmt.INITIAL_FORMS(oldDjangoFormset.mgmtVal('INITIAL_FORMS'));
                    event.data.sourceModule.item_set__mgmt.TOTAL_FORMS(oldDjangoFormset.mgmtVal('TOTAL_FORMS'));
                    event.data.targetModule.item_set__mgmt.INITIAL_FORMS(newDjangoFormset.mgmtVal('INITIAL_FORMS'));
                    event.data.targetModule.item_set__mgmt.TOTAL_FORMS(newDjangoFormset.mgmtVal('TOTAL_FORMS'));

                    ko.tasks.runEarly();
                    $(document).trigger('curation_nouveau:flush_pending_bindings');
                    ko.tasks.runEarly();

                    var modulesToSort = [fromModule];
                    if (fromModule != targetModule) {
                        modulesToSort.push(targetModule);
                    }
                    modulesToSort.forEach(function(moduleElement) {
                        $(moduleElement).find('li.article').each(function(i, itemElement) {
                            var item = ko.dataFor(itemElement);
                            item.position(i);
                        });
                    });
                    ko.tasks.runEarly();
                    $(document).trigger('curation_nouveau:operationend');
                }
            };
        },
        /**
         * The position of the module as it will be on save, skipping deleted modules
         */
         realPosition: function() {
             var currentPosition = this.position();
             var position = 0;
             this.parent().module_set().forEach(function(module) {
                 if (module.layout() == 'stash') {
                     return;
                 }
                 if (module.position() >= currentPosition) {
                     return;
                 }
                 if (!module.DELETE()) {
                     position++;
                 }
             });
             return position;
         },
         addBlankItem: function(position) {
             var len = this.item_set().length;
             var data = ko.mapping.toJS(this.item_set__tmpl);
             if (typeof position == 'undefined') {
                 position = len;
             }
             data.position = position;
             var item = this.__ko_mapping__.item_set.create({data: data, parent: this});
             this.item_set.push(item);
             this.item_set().forEach(function(i) {
                 if (i == item) {
                     return;
                 }
                 if (i.position() >= position) {
                     i.position(i.position() + 1);
                 }
             });
         },
         addBlankModule: function(layout, position) {
             var self = this;
             var template = ko.mapping.toJS(this.parent().module_set__tmpl);
             template.item_set = [];
             template.item_set__mgmt = {TOTAL_FORMS: 0, INITIAL_FORMS: 0, MAX_NUM_FORMS: 1000};
             template.item_set__tmpl = ko.mapping.toJS(this.item_set__tmpl);
             template.item_set__tmpl.module = "";
             template.layout = layout;
             template.position = position;

             this.parent().module_set().forEach(function(m) {
                 if (m.position() >= position) {
                     m.position(m.position() + 1);
                 }
             });

             var newModule = new HomepageModels.HomepageModule(template);
             newModule.parent = function() {
                 return self.parent();
             };

             this.parent().module_set.push(newModule);

             this.parentDjangoFormset().add();
             $(document).trigger('curation_nouveau:flush_pending_bindings');

             return newModule;
         },
         insertAfter: function() {
             var newPosition = this.position() + 1;
             var self = this;
             BootstrapDialog.show({
                 title: 'Add a module',
                 message: $('#add-module-modal').clone().children(),
                 onshow: function() {
                     var dialog = this;
                     dialog.getModal().find('.module-icon').click(function(e) {
                         e.stopPropagation();
                         e.preventDefault();
                         $(document).trigger('curation_nouveau:operationstart');
                         dialog.getModal().modal('hide');
                         var $el = $(this);
                         var initialNum = parseInt($el.data('initialNum'), 10);
                         var moduleType = $el.data('moduleType');

                         var newModule = self.addBlankModule(moduleType, newPosition);
                         var formId = newModule.$djangoForm().attr("id");
                         var nestedFormsetId = formId.replace(/_set(\d+)$/, '_set-$1-item_set-group');
                         var $nestedFormset = $('#' + nestedFormsetId);

                         for (var i = 0; i < initialNum; i++) {
                             newModule.addBlankItem();
                             $nestedFormset.djangoFormset().add();
                         }
                         var totalForms = $nestedFormset.djangoFormset().mgmtVal('TOTAL_FORMS');
                         newModule.item_set__mgmt.TOTAL_FORMS(totalForms);
                         $(document).trigger('curation_nouveau:flush_pending_bindings');
                         ko.tasks.runEarly();
                         $(document).trigger('curation_nouveau:operationend');
                     });
                 }
             });
         },
         canMoveUp: function() {
             return (this.position() >= 2);
         },
         canMoveDown: function() {
             var modules = this.parent().module_set();
             var nextModule = modules[this.position() + 1];
             if (!nextModule) {
                 return false;
             }
             return nextModule.canMoveUp();
         }
    });

    exports.HomepageItem = HomepageItem;
    exports.HomepageModule = HomepageModule;
});
