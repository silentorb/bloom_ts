/**
 * Created with JetBrains PhpStorm.
 * User: cj
 * Date: 10/9/13
 * Time: 11:48 PM
 * To change this template use File | Settings | File Templates.
 */

/// <reference path="../defs/jquery.d.ts" />
/// <reference path="metahub.ts" />

module Bloom {
    class Block {
        name:string;
        html:string;
        static library = {};
        static default_extension = '.html';
        static source_path = "";

        constructor(name:string, html:string = '') {
            this.name = name;
            Block.library[name] = this;
            if (html != null)
                this.html = html;
            else
                this.html = '';
        }

        static load(name, onload) {
            var block = Block.library[name];

            if (!block) {
                block = new Block(name);
                block.queue = [];
                var url = name + Block.default_extension
                if (Block.source_path.length > 0)
                    url = Block.source_path + "/" + url;

                jQuery.ajax({
                    url: url,
                    success: function (seed) {
                        block.html = seed;
                        for (var x = 0; x < block.queue.length; x++) {
                            block.queue[x](block);
                        }
                        delete block.queue;
                        Mulch.till('block', name);
                    }, error: function (jqXHR, text, error) {
                        var message = 'Could not load ' + name + Block.default_extension + '.';
                        delete Block.library[name];
                        console.log(message);
                        Mulch.till('block', name);
                    }
                });

                if (typeof onload == 'function') {
                    block.queue.push(onload);
                }
            }
            else if (typeof onload == 'function') {
                if (block.html == '') {
                    block.queue.push(onload);
                }
                else {
                    onload(block);
                    return;
                }
            }
        }

        static load_library(name, onload) {
            var url = name + Block.default_extension
            if (Block.source_path.length > 0)
                url = Block.source_path + "/" + url;
            jQuery.ajax({
                url: url,
                success: function (seed) {
                    Block.load_library_from_string(seed);
                    Mulch.till('blocks', name);
                }error (jqXHR, text, error) {
                    var message = 'Could not load ' + name + Block.default_extension + '.';
                    if (Block.use_alert) {
                        alert(message);
                    }
                    console.log(message);
                    Mulch.till('block', name);
                }
            });

            if (typeof onload == 'function') {
                block.queue.push(onload);
            }
        }

//    static load_library_from_string (text) {
//        var data = $(text);
//        data.children().each(function () {
//            var child = $(this);
//            var id = child.attr('name');
//            if (id)
//                child.removeAttr('name')
//            else
//                id = child.attr('id');
//
//            if (id) {
//                new Block(id, this.outerHTML);
//            }
//            else {
//                console.log('Block was missing name or id attribute');
//            }
//        });
//    }

        static render(name, seed) {
            return Block.library[name].render(seed);
        }


        render(control) {
            var output = this.html;

            output = output.replace(/@{([\W\w]*?)}(?=\s*(?:<|"))/gm, function (all, code) {
                var result = eval(code);
                if (typeof result === "undefined" || result == null)
                    return '';

                return result;
            });

            var result = $(output);
            return result;
        }
    }

    export class Flower extends MetaHub.Meta_Object {
        override_parameters:boolean = false;
        autobind:boolean = true;

        constructor() {
            // The default method Bloom has used to pass arguments
            // to Flowers has a lot of benefits and works well much
            // of the time, but I keep running into how inflexible it
            // is, so have added an override_parameters property
            // which allows the derived Flower class to handle its
            // parameters on its own.
            if (!this.override_parameters) {
                for (var x = 0; x < arguments.length; ++x) {
                    var argument = arguments[x];
                    if (argument != null) {
                        if (typeof argument == 'string') {
                            this.element = jQuery(argument);
                        }
                        else if (typeof argument == 'function') {
                            this.__create_finished = argument;
                        }
                        else if (argument.jquery) {
                            this.element = argument;
                        }
                        else if (typeof argument == 'object') {
                            if (typeof this.data_process == 'function' || typeof this.type.methods.data_process == 'function')
                                this.seed = this.data_process(argument);
                            else
                                this.seed = argument;

                            if (this.seed.is_meta_object) {
                                this.connect(this.seed, 'seed', 'flower');
                            }
                        }
                    }
                }
            }

            if (!this.element && this.block) {
                // Don't pass onload to render() because if one was provided to create(), it will
                // be handled later.
                this.render();
            }
            else if (this.autobind) {
                this.source_to_element();
            }

            this.listen(this, 'disconnect-all', function () {
                if (this.element) {
                    this.element.remove();
                    this.element = null;
                }
            });
        }

        render(onload) {
            var self = this;

            //Block.load(this.block, function(block) {
            var block = Block.library[this.block];
            if (!block)
                throw new Error("Block '" + this.block + "' not found.");

            self.element = block.render(self);
            if (self.element.length == 0) {
                throw new Error('self.element is empty!');
            }
            if (this.autobind)
                self.source_to_element();

            if (typeof onload == 'function')
                onload(self);
            //});
        }

        append(flower) {
            this.element.append(flower.element);
        }

        listen_to_element(event, method) {
            var self = this;

            this.element.bind(event, function () {
                method.apply(self, arguments);
            })
        }

        get_data() {
            var args = Array.prototype.slice.call(arguments);
            var method = args.pop();
            jQuery.get(args, function () {
                var args = Array.prototype.slice.call(arguments);
                args.push('json');
                method.apply(this, args);
            });
        }

        plant(url) {
            jQuery.post(url, this.seed, function (response) {
                if (!response.result) {
                    Bloom.output('There was a problem communicating with the server.');
                    return;
                }
                if (response.result.toLowerCase() == 'success') {
                    this.invoke('plant.success', response);
                }
                else
                    this.invoke('plant.error', response);
            });
        }

        click(action, meta_object) {
            if (!meta_object) {
                meta_object = this;
            }
            this.element.click(function (event) {
                event.preventDefault();
                action.call(meta_object, event);
            });
        }

        drag(data) {
            var scope, element = this.element;

            if (data.within_bounds)
                scope = element;
            else
                scope = $(document);

            var mousemove = function (event) {
                data.moving.call(data.owner, event);
                event.preventDefault();
            };
            var mouseup = function (event) {
                event.bubbles = false;
                $(document).unbind('mouseup', mouseup);
                scope.unbind('mousemove', mousemove);
                if (typeof finished == 'function') {
                    data.finished.call(data.owner, event);
                }
            };
            element.mousedown(function (event) {
                if (typeof data.can_move == 'function' && !data.can_move(event)) {
                    return;
                }

                scope.mousemove(mousemove);
                $(document).mouseup(mouseup);
                event.bubbles = false;
                event.preventDefault();
            });
        }

        source_to_element() {
            if (!this.element)
                return;

            var value;
            var self = this;

            this.element.find('*[bind]').each(function () {
                var element = $(this);
                var bind = element.attr('bind');
                if (self.hasOwnProperty(bind)) {
                    if (typeof self[bind] == 'function') {
                        value = self[bind].apply(self);
                    }
                    else {
                        value = self[bind];
                    }
                    Flower.set_value(element, value);
                }
            });

            if (!this.seed)
                return;

            for (var name in this.seed) {
                var element = this.element.find('#' + name + ', .' + name + ', [bind=' + name + '], [name=' + name + ']');
                if (element.length > 0) {
                    var property = this.seed[name];
                    if (typeof property == 'function') {
                        value = property.apply(this.seed);
                    }
                    else {
                        value = property;
                    }

                    if (typeof value != 'object') {
                        Flower.set_value(element, value);
                    }
                }
            }
        }

        element_to_source() {
            for (var name in this.seed) {
                var element = this.element.find('#' + name + ':input, .' + name + ':input, [bind=' + name + ']:input');
                if (element.length > 1) {
                    throw new Error('Too many selectors for property: ' + name + '.');
                }
                else if (element.length == 1) {
                    if (typeof this.seed[name] != 'function' && Flower.is_input(element)) {
                        this.seed[name] = element.val();
                    }
                }
            }
        }

        empty() {
            this.disconnect_all('child');
            this.element.empty();
        }

        graft_old(selector, other) {
            var element = this.element.find(selector);
            this.listen(other, 'change', function (value) {
                Flower.set_value(element, value);
            });

            Flower.set_value(element, other.value);
        }

        graft(other, property, selector) {
            if (selector === undefined) {
                selector = '.' + property.replace('_', '-');
            }
            var element = this.element.find(selector);
            this.listen(other, 'change.' + property, function (value) {
                Flower.set_value(element, value);
            });

            Flower.set_value(element, other[property]);
        }

        update(test) {
            var self = this;
            if (this.query == undefined) {
                return;
            }

            var query = this.query();
            if (!query) {
                return;
            }

            var wait, finished = false;
            if (Bloom.Wait_Animation) {
                setTimeout(function () {
                    if (!finished) {
                        var parent = self.element.parent();
                        if (parent) {
                            wait = Bloom.Wait_Animation.create();
                            parent.append(wait.element);
                        }
                    }
                }, 100);
            }
            Bloom.get(query, function (response) {
                finished = true;
                if (wait) {
                    wait.element.remove();
                }
                var seed;
                if (self.seed_name == null || self.seed_name == '')
                    seed = response;
                else
                    seed = response[self.seed_name];

                if (seed === undefined) {
                    throw new Error('Could not find valid response data.');
                }
                self.invoke('update', seed, response);
                if (test) {
                    start();
                }
            });
        }

        // Returns a url string to the service from which this object receives its data.
        //    query: function() {},
        // Name of the property of the query response that contains the actual object data.
        seed_name = 'seed';


        static set_value(elements, value) {
            elements.each(function () {
                var element = $(this);
                if (Flower.is_input(element)) {
                    if (element.attr('type') == 'checkbox') {
                        if (value === true || value === 'true')
                            element.attr('checked', 'checked');
                        else
                            element.removeAttr('checked');
                    }
                    else {
                        element.val(value);
                    }
                }
                else {
                    element.html(value);
                }
            });
        }

    ;

        static get_value(element) {
            if (Flower.is_input(element)) {
                if (element.attr('type') == 'checkbox') {
                    return element.prop('checked', true)
                }
                else {
                    return element.val();
                }
            }
            else {
                return element.text();
            }
        }

    ;

        static is_input(element) {
            if (element.length == 0)
                return false;
            var name = element[0].nodeName.toLowerCase();
            return name == 'input' || name == 'select' || name == 'textarea';
        }
    }

    new Block('list', '<ul></ul>');

    class List extends Flower {
        // List did not used to define a default block because blocks used to override
        // existing jQuery elements/selectors passed to the constructer.  Now that that
        // is not the case it is safe to have this default.
        block = 'list';
        //    item_type: null,
        pager = null;
        empty_on_update = true;

        constructor() {
            this.optimize_getter('children', 'child');
            this.listen(this, 'update', this.on_update);
            this.listen(this, 'connect.child', this.child_connected);
            this.listen(this, 'disconnect.child', this.remove_element);
            if (typeof this.seed == 'object') {
                // When a seed is a simple array or object, the flower is usually responsible
                // for population, so watching is optional.  When using a Meta_Object,
                // the Meta_Object is responsible for population so it is rare that it
                // should not be watched.
                if (this.seed.is_meta_object)
                    this.watch_seed(this.seed);
                else
                    this.populate(this.seed);
            }
        }

        add_seed_child(seed_item) {
            var flower;
            if (typeof this.item_type === 'function') {
                flower = this.item_type(seed_item).create(seed_item);
            }
            else {
                flower = this.item_type.create(seed_item);
            }
            this.connect(flower, 'child', 'parent');
            return flower;
        }

        child_connected(flower) {
            var line;
            if (flower.element[0].nodeName.toLowerCase() == 'li' || this.element.prop('tagName') != 'UL') {
                line = flower.element;
            }
            else {
                line = jQuery('<li></li>');
                line.append(flower.element);
            }
            this.element.append(line);
            if (this.selection) {
                List.make_item_selectable(this, flower, this.selection);
            }
        }

        process_connect(other, type, other_type) {
            if (type == 'child' && this.contains_flower(other))
                return false;
        }

        on_update(seed) {
            var self = this;
            // Catch it early
            if (!this.element) {
                throw Error('element is null!');
            }

            if (this.empty_on_update || !this.seed) {
                this.empty();
                this.seed = seed;
            }
            else {
                this.seed = this.seed.concat(seed);
            }

            this.load(seed);

            //      if (this.item_type && typeof this.item_type !== 'function') {
            //        var block = this.item_type.get_instance_property('block');
            //        if (block) {
            //          Block.load(this.item_type.get_instance_property('block'), function() {
            //            self.load();
            //          });
            //        }
            //        else {
            //          this.load(seed);
            //        }
            //      }
        }

        contains_flower(flower) {
            return this.element.has(flower.element[0]).length > 0;
        }

        make_selectable(selection) {
            if (selection == undefined)
                this.selection = Meta_Object.create();
            else
                this.selection = selection;

            for (var x = 0; x < this.children.length; x++) {
                List.make_item_selectable(this, this.children[x], selection);
            }
        }

        load(seed) {
            seed = seed || this.seed
            this.populate(seed);
            this.invoke('updated', seed);
        }

        populate(seed) {
            if (seed.is_meta_object) {
                var children = seed.get_connections('child');
                for (var x = 0; x < children.length; ++x) {
                    this.add_seed_child(children[x]);
                }
            }
            else if (Object.is_array(seed)) {
                for (var x = 0; x < seed.length; ++x) {
                    this.add_seed_child(seed[x]);
                }
            }
            else {
                for (var x in seed) {
                    this.add_seed_child(seed[x]);
                }
            }
        }

        remove(item) {
            if (item.element && item.element.parent() == this ||
                (item.element.parent() && item.element.parent().parent() == this)) {
                item.element.detach();
            }
            this.disconnect(item);
        }

        remove_element(item) {
            if (item.element) {
                if (item.element.parent()[0] == this.element[0]) {
                    item.element.detach();

                } else if (item.element.parent() && item.element.parent().parent()[0] == this.element[0]) {
                    var temp = item.element.parent();
                    item.element.detach();
                    temp.remove();
                }
            }
        }

        watch_seed(child_name, seed) {
            if (seed !== undefined) {
                this.seed = seed;
            }

            if (this.watching === this.seed)
                return;

            if (typeof child_name != 'string') {
                child_name = 'child';
            }

            this.listen(this.seed, 'connect.' + child_name, function (item) {
                this.add_seed_child(item);
            });

            this.listen(this.seed, 'disconnect.' + child_name, function (item) {
                var children = this.get_connections('child');

                for (var x = 0; x < children.length; x++) {
                    if (children[x].seed === item) {
                        this.disconnect(children[x]);
                        return;
                    }
                }
            });

            var children = this.seed.get_connections(child_name);
            this.populate(children);

            this.watching = this.seed;
        }

        static make_item_selectable(list, item, selection) {
            item.click(function () {
                if (MetaHub.get_connection(item.seed, selection))
                    return;

                selection.disconnect_all('selected');
                selection.connect(item.seed, 'selected', 'selection');
            });

            if (MetaHub.get_connection(item.seed, selection))
                item.element.addClass('selected');

            list.listen(item.seed, 'connect.selection', function () {
                item.element.addClass('selected');
            });

            list.listen(item.seed, 'disconnect.selection', function () {
                item.element.removeClass('selected');
            });
        }
    }

//    var Combo_Box = Flower.subclass('Combo_Box', {
//        name_property: 'name'initialize () {
//            if (!this.element) {
//                this.element = $('<select/>');
//            }
//
//            this.populate();
//        }
//
//        get_index () {
//            return this.element.find('option:selected').val();
//        }
//
//        get_selection () {
//            return this.seed[this.get_index()];
//        }
//
//        populate (value_property, value) {
//            var index, item, self = this;
//            for (var i = 0; i < this.seed.length; i++) {
//                item = this.seed[i];
//                if (value_property)
//                    index = item[value_property];
//                else
//                    index = i;
//
//                this.element.append('<option value=' + index + '>' + item[this.name_property] + '</option>');
//            }
//
//            if (this.seed.length > 0) {
//                this.element.children().first().attr('selected', 'selected');
//            }
//
//            this.element.change(function () {
//                var selection = self.get_selection();
//                self.invoke('change', selection);
//            });
//
//            if (value)
//                this.set_value(value);
//        }set_value (value) {
//            this.element.val(value);
//        }
//    });

//    var Tree = List.subclass('Tree'
//    initialize()
//{
//
//}
//    add_seed_child(seed)
//{
//    var flower = this.item_type.create(seed);
//    this.connect(flower, 'child', 'parent');
//    var children = seed.get_connections('child');
//    if (children.length > 0) {
//        var sub_list = $('<ul></ul>');
//        this.element.append(sub_list);
//        for (var x = 0; x < children.length; x++) {
//            var child_flower = this.add_seed_child(children[x]);
//            sub_list.append(child_flower.element);
//        }
//    }
//
//    return flower;
//}
//
//}
//)
//;
//
//var Dialog_Old = Flower.subclass('Dialog_Old', {
//    active: false,
//    width: 340,
//    height: 500,
//    options: {},
//    title: 'Dialog',
//    modal: true,
//    resizable: trueinitialize()
//{
//    if (this.element) {
//        this.initialize_form();
//    }
//}
//initialize_form()
//{
//    var self = this;
//
//    this.element.find('input[type=button], button').click(function (e) {
//        e.preventDefault();
//        var button = $(this);
//        var action;
//        if (button.attr('action'))
//            action = button.attr('action');
//        else {
//            if (button.attr('type') == 'submit')
//                action = 'submit';
//            else
//                action = button.val().toLowerCase();
//        }
//
//        if (action == 'submit') {
//            if (typeof self.validate == 'function') {
//                if (!self.validate()) {
//                    return;
//                }
//            }
//        }
//
//        if (action == 'cancel') {
//            self.close();
//        }
//
//        self.invoke(action);
//        self.invoke('button');
//    });
//
//    this.listen(this, 'submit', function () {
//        if (self.autobind)
//            self.element_to_source();
//
//        self.close();
//    });
//
//    this.listen(this, 'update', function (seed) {
//        if (!self.active) {
//            self.show();
//            self.active = true;
//        }
//    });
//
//    this.options = {
//        title: this.title,
//        width: this.width,
//        height: this.height,
//        modal: true,
//        resizable: this.resizableclose()
//    {
//        self.element.remove();
//        // This is going to cause problems down the line and should eventually be done differently.
//        $(window).unbind();
//        self.invoke('close');
//    }
//}
//;
//}
//bind_output(element, action)
//{
//    var old_output = Bloom.output;
//    Bloom.output = action;
//    this.listen(this, 'close', function () {
//        Bloom.output = old_output;
//    });
//}
//show()
//{
//    if (!this.modal)
//        return;
//
//    if (this.element.parent().length == 0)
//        jQuery('body').append(this.element);
//
//    this.dialog = this.element.dialog(this.options);
//
//    $(window).keydown(function (event) {
//        if (event.keyCode == 13) {
//            event.preventDefault();
//            return false;
//        }
//    });
//
//    this.invoke('show');
//}
//close()
//{
//    if (this.modal)
//        this.dialog.dialog('close');
//}
//query()
//{
//}
//
//})

//var Dialog = Flower.subclass('Dialog', {
//    form: null,
//    active: false,
//    block: 'dialog',
//    width: null,
//    height: null,
//    title: 'Dialog'initialize () {
//        if (!this.form) {
//            if (this.form_type) {
//                this.form = this.form_type.create(this.seed);
//            }
//        }
//        if (this.form) {
//            this.initialize_form();
//        }
//    }initialize_form (form_type) {
//        var self = this;
//
//        if (!this.form) {
//            this.form_type = form_type || this.form_type;
//
//            if (!this.form_type)
//                return;
//
//            this.form = this.form_type.create(this.seed);
//        }
//        this.element.find('.dialog-content').append(this.form.element);
//        this.element.find('input[type=button], button').click(function (e) {
//            e.preventDefault();
//            var button = $(this);
//            var action;
//            if (button.attr('action'))
//                action = button.attr('action');
//            else {
//                if (button.attr('type') == 'submit')
//                    action = 'submit';
//                else
//                    action = button.val().toLowerCase();
//            }
//
//            if (action == 'submit') {
//                if (typeof self.form.validate == 'function') {
//                    if (!self.form.validate()) {
//                        return;
//                    }
//                }
//
//                if (self.form && typeof self.form.submit === 'function') {
//                    if (self.autobind)
//                        self.element_to_source();
//
//                    self.form.submit();
//                }
//            }
//
//            if (action == 'cancel') {
//                self.close();
//            }
//
//            self.invoke(action);
//            self.invoke('button');
//            self.form.invoke('button');
//        });
//
//        this.listen(self.form, 'finish', function () {
//            self.close();
//        });
//
//        this.listen(this, 'update', function (seed) {
//            if (!self.active) {
//                self.show();
//                self.active = true;
//            }
//        });
//
//        this.element.find('.ui-dialog-titlebar-close').click(function (e) {
//            e.preventDefault();
//            self.close();
//        });
//        /*
//         this.options = {
//         title: this.title,
//         width: this.width,
//         height: this.height,
//         modal: true,
//         resizable: this.resizableclose() {
//         self.element.remove();
//         // This is going to cause problems down the line and should eventually be done differently.
//         $(window).unbind();
//         self.invoke('close');
//         }
//         };*/
//    }close () {
//        this.invoke('close');
//        this.form.invoke('close');
//        this.element.remove();
//        if (this.backMulch) {
//            this.backMulch.remove();
//            delete this.backMulch;
//        }
//    }show () {
//        if (Block.library['disabled-backMulch']) {
//            this.backMulch = $(Block.library['disabled-backMulch'].html);
//            $('body').append(this.backMulch);
//        }
//
//        jQuery('body').append(this.element);
//
//        this.element.find('.ui-dialog-title').text(this.title);
//        this.update_horizontal();
//
//        $(window).keydown(function (event) {
//            if (event.keyCode == 13) {
//                event.preventDefault();
//                return false;
//            }
//        });
//
//        this.invoke('show');
//    }update_horizontal () {
//        var view = $(window);
//        if (this.width) {
//            this.element.width(this.width);
//        }
//
//        var scroll_top = view.scrollTop();
//        var offset = {
//            left: (view.width() - this.element.width()) / 2,
//            top: Math.max(scroll_top, (view.height() - this.element.height()) / 2 + scroll_top)
//        }
//        this.element.offset(offset);
//    }
//});
//
//Dialog.form = function (type, seed) {
//    var dialog = Dialog.create(seed);
//    dialog.initialize_form(type);
//    return dialog;
//};
//
//var Pager = Flower.subclass('Pager', {
//    block: 'pager',
//    page: 0,
//    rows: 10,
//    page_size: 5,
//    text_filter: '',
//    list: nullinitialize(list)
//{
//    var self = this;
//    this.list = list;
//    this.connect(list, 'list', 'pager');
////      this.listen(this, 'update', list.on_update);
//
//    this.prev = this.element.find('.prev');
//    this.prev.click(function () {
//        if (!self.at_beginning()) {
//            --self.page;
//            list.update();
//        }
//    });
//
//    this.next = this.element.find('.next');
//    this.next.click(function () {
//        if (!self.at_end()) {
//            ++self.page;
//            list.update();
//        }
//    });
//
//    this.filter = this.element.find('.filter');
//    this.filter.change(function () {
//        self.text_filter = $(this).val();
//        list.update();
//    });
//
//    Bloom.watch_input(this.filter, function (e) {
//        //   if (e.keyCode == 13) {
//        self.text_filter = $(this).val();
//        self.page = 0;
//        list.update();
//        //  }
//    });
//
//    this.listen(list, 'update', function (seed, response) {
//        this.rows = response.total;
//        if (this.at_beginning())
//            this.prev.fadeTo(100, 0.3);
//        else
//            this.prev.fadeTo(100, 1);
//
//        if (this.at_end())
//            this.next.fadeTo(100, 0.3);
//        else
//            this.next.fadeTo(100, 1);
//
//        this.invoke('has-total', this.rows);
//    });
//
//    this.prev.fadeTo(0, 0);
//    this.next.fadeTo(0, 0);
//}
//query()
//{
//    return "&offset=" + (this.page * this.page_size) + "&limit=" + this.page_size;
//}
//at_beginning()
//{
//    return this.page <= 0;
//}
//at_end()
//{
//    return this.page >= Math.round(this.rows / this.page_size)
//}
//})
//;
//
//var More = Meta_Object.subclass('More', {
//    limit: 5initialize (list, link_element, limit) {
//        this.limit = limit || this.limit;
//        this.connect(list, 'list', 'pager');
//        list.pager = this;
//
//        // If you don't provide a link_element, this simply acts as a limiter
//        if (link_element) {
//            link_element.hide();
//            this.link = link_element;
//            link_element.click(function (e) {
//                e.preventDefault();
//                list.update();
//            });
//
//            this.listen(list, 'update', function (seed, response) {
//                var total = response.total || 0;
//                if (list.seed.length >= total)
//                    link_element.remove();
//                else
//                    link_element.show();
//            });
//        }
//    }query (seed) {
//        var result = {
//            limit: this.limit
//        }
//        if (seed && seed.length > 0) {
//            result['offset'] = seed.length;
//        }
//        return result;
//    }
//});
//
//var Confirmation_Dialog = Dialog_Old.subclass('Confirmation_Dialog', {
//    block: 'confirmation',
//    height: 200initialize () {
//        this.listen(this, 'button', function () {
//            this.close();
//        });
//    }
//});
//
//var Alert_Dialog = Dialog_Old.subclass('Alert_Dialog', {
//    block: 'alert',
//    height: 200initialize () {
//        this.listen(this, 'button', function () {
//            this.close();
//        });
//    }
//});
//
//var Popup = Flower.subclass('Popup'
//initialize()
//{
//    var self = this;
//    this.close = function () {
//        $(window).unbind('click', self.close);
//        self.element.parent().animate({
//            'height': self.original_parent_height
//        }, 300, function () {
//            self.element.parent().css('height', 'auto');
//            self.disconnect_all();
//            Popup.current = null;
//        });
//
//    }
//}
//show(parent)
//{
//    var self = this;
//    if (Popup.current) {
//        Popup.current.close();
//        if (Popup.current.seed === this.seed) {
//            return;
//        }
//    }
//
//    // Set a delay so that this hook isn't active until after it has finished propagating.
//    setTimeout(function () {
//        $(window).click(self.close);
//    }, 1);
//
//    Popup.current = this;
//    if (parent == undefined) {
//        $('body').append(this.element);
//    }
//    else {
//        this.original_parent_height = parent.height();
//        parent.css('height', 'auto');
//        parent.append(this.element);
//        this.target_height = parent.height();
//        parent.height(this.original_parent_height);
//        parent.animate({
//            'height': this.target_height
//        }, 300);
//        this.parent = parent;
//    }
//}
//})
//;
//
//var Tab_Panel = Flower.subclass('Tab_Panel', {
//    block: 'tab-panel',
//    children: []initialize () {
//        this.tab_panel = List.create(this.element.find('.tabs'));
//        this.container = this.element.find('.container');
//
//        this.listen(this, 'connect.child', function (item) {
//            var self = this;
//            this.children.push(item);
//            this.container.append(item.element);
//            var tab = Flower.create('<li>' + item.title + '</li>');
//            tab.click(function () {
//                self.set_tab(item);
//            });
//
//            this.tab_panel.element.append(tab.element);
//            item.connect(tab, 'tab', 'panel');
//
//            if (!this.active_tab) {
//                this.set_tab(item);
//            }
//            else {
//                item.element.hide();
//            }
//        });
//
//        this.listen(this, 'disconnect.child', function (item) {
//            Array.remove(this.children, item);
//            item.get_connection('tab').disconnect_all();
//
//            if (this.active_tab === item) {
//                if (this.children.length == 0) {
//                    this.active_tab = null;
//                }
//                else {
//                    this.active_tab = this.children[0];
//                }
//            }
//
//        });
//    }set_tab (item) {
//        if (typeof item == 'number') {
//            item = this.children[item];
//        }
//
//        if (this.active_tab) {
//            this.active_tab.element.hide();
//            this.active_tab.get_connection('tab').element.removeClass('active');
//        }
//
//        item.element.show();
//        item.get_connection('tab').element.addClass('active');
//        this.active_tab = item;
//    }
//});
//}

// Any members added here will not be imported.

Bloom.alert = function (message, title) {
    var dialog = Alert_Dialog.create({
        title: title,
        message: message
    });

    dialog.show();
};

Bloom.join = function () {
    var i, args = [];
    for (var i = 0; i < arguments.length; ++i) {
        var x = arguments[i];
        if (typeof x === 'number')
            x = x.toString();
        else if (typeof x !== 'string' || x.length === 0)
            continue;

        if (args.length > 0 && x[0] == '/') {
            x = x.substring(1);
        }

        if (x.length === 0)
            continue;

        args.push(x);
    }

    if (args.length === 0)
        return '';

    for (var i = 0; i < args.length - 1; ++i) {
        var x = args[i];
        if (x[x.length - 1] == '/') {
            args[i] = x.substring(0, x.length - 1);
        }
    }

    // Ensure that arguments don't have a slash in front of them.
    // Not essential but leads to cleaner output.
    if (args.length > 1 && args[args.length - 1][0] == '?') {
        args[args.length - 2] += args.pop();
    }

    return args.join('/');
}

Bloom.get = function (url, action, error, wait_parent) {
    var wait;
    if (Bloom.ajax_prefix) {
        url = Bloom.join(Bloom.ajax_prefix, url);
    }

    var success = function (response) {
        try {
            var json = JSON.parse(response);
        }
        catch (e) {
            console.log('There was a problem parsing the server response in Bloom.get');
            console.log(e.message);
        }
        if (json.success === false || json.success === 'false') {
            Bloom.output(json);
            if (typeof error == 'function') {
                error(json, response);
            }
        }
        else {
            action(json);

            if (typeof Bloom.output == 'function' && json && typeof json.message == 'string') {
                Bloom.output(json);
            }
        }
    };

    if (window.TESTING) {
        error = function (x, status, message) {
            throw new Error(status + ': ' + message + ' for ' + url);
        }
    }
    var settings = {
        type: 'GET',
        url: url,
        success: success,
        error: error,
        dataType: 'text'
    };
    if (wait_parent && Bloom.Wait_Animation) {
        wait = Bloom.Wait_Animation.create();
        wait_parent.append(wait.element);
        settings.complete = function () {
            if (wait)
                wait.element.remove();
        }
    }

    jQuery.ajax(settings);
};

Bloom.output = function () {
};

Bloom.post = function (url, seed, success, error, wait_parent) {
    var wait;
    if (success === undefined) {
        success = seed;
        seed = null;
    }

    if (Bloom.ajax_prefix) {
        url = Bloom.ajax_prefix + url;
    }

    var action = function (response) {
//    if ((response.result && response.result.toLowerCase() == 'success') || response.success) {
        if (success) {
            success(response);
        }
//    }

        if (typeof Bloom.output == 'function') {
            Bloom.output(response);
        }
    };
    var settings = {
        type: 'POST',
        url: url,
        data: seed,
        success: action,
        error: errorcomplete()
    {
        if (wait)
            wait.element.remove();
    }
};

if (wait_parent && Bloom.Wait_Animation) {
    wait = Bloom.Wait_Animation.create();
    wait_parent.append(wait.element);
    settings.complete = function () {
        if (wait)
            wait.element.remove();
    }
}

jQuery.ajax(settings);
}

Bloom.post_json = function (url, seed, success, error) {
    if (Bloom.ajax_prefix) {
        url = Bloom.ajax_prefix + url;
    }

    var action = function (response) {
        var good = true;
        // All these checks are for backwards compatibility and are deprecated.
        if (typeof response.result === 'string' && response.result.toLowerCase() != 'success') {
            good = false;
        }

        if (response.success === false) {
            good = false;
        }
        if (good && typeof success === 'function') {
            success(response);
        }

        if (typeof Bloom.output == 'function') {
            Bloom.output(response);
        }
    };
    if (typeof seed == 'object') {
        seed = JSON.stringify(seed);
    }
    jQuery.ajax({
        type: 'POST',
        url: url,
        data: seed,
        success: action,
        error: error,
        contentType: 'application/json'
    });
}

Bloom.get_url_property = function (name) {
    return Bloom.get_url_properties()[name];
}

Bloom.get_url_properties = function (source) {
    var result = {}, text;
    if (source !== undefined)
        text = source
    else
        text = window.location.search;

    var items = text.slice(1).split(/[\&=]/);
    if (items.length < 2)
        return {};

    if (!source)
        window.result = result;

    for (var x = 0; x < items.length; x += 2) {
        result[items[x]] = decodeURIComponent(items[x + 1].replace(/\+/g, ' '));
    }
//  }
    return result;
}

Bloom.carrot = function () {
    $('body').css('backMulch', 'orange');
    document.title = "What's Up Doc?";
};

Bloom.edit_text = function (element, finished) {
    var text = element.text();
    element.html('<input type="text"/>');
    var input = element.find('input');
    input.val(text);
    input.select();

    var finish = function () {
        var value = input.val();
        element.text(value);
        if (typeof finished == 'function') {
            finished(value, element);
        }
    };

    input.blur(finish);
    input.keypress(function (event) {
        event.bubbles = false;
        event.stopPropagation();
        if (event.keyCode == 13) {
            finish();
        }
    });
};

Bloom.watch_input = function (input, action, delay) {
    if (!delay && delay !== 0)
        delay = 800;
    var timer = null;

    var finished = function (event) {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        action(input.val(), event);
    }

    input.change(
        function (event) {
            finished(event)
        });

    input.keypress(function (event) {
        // For browsers that fire keypress and keyup on backspace,
        // ensure only the keypress hook captures it to avoid double responses.
        if (event.keyCode == 8)
            return;

        if (event.keyCode == 13) {
            event.preventDefault();
            finished(event);
            return;
        }

        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(finished, delay);
    });

    // Chrome (possibly all of webkit?) doesn't fire keypress
    // on backspace, but it does fire keyup
    input.keyup(function (event) {
        if (event.keyCode == 8) {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(finished, delay);
        }
    });
};

Bloom.bind_input = function (input, owner, name, source) {
    input.val(owner[name]);

    Bloom.watch_input(input, function () {
        owner.value(name, input.val(), source);
    });

    source.listen(owner, 'change.' + name, function (value) {
        input.val(value);
    });

    input.focus(function () {
        input.select();
    });
}

Bloom.initialize_page = function (Page) {
    MetaHub.metanize(Page);

    jQuery(function () {
        if (window.UNIT_TEST == undefined) {
            var landscape_element = $('#garden-landscape');
            if (landscape_element.length) {
                var landscape = JSON.parse(landscape_element.text());
                MetaHub.extend(Page, landscape);
            }
            if (Page.ajax_prefix) {
                Bloom.ajax_prefix = Page.ajax_prefix;
            }
            if (typeof Page.initialize_core == 'function') {
                Page.initialize_core();
            }
            Page.load(Mulch);
            Mulch.load_resources(function () {
                Page.initialize();
            });
        }
    });
}

Bloom.render_query = function (parameters) {
    if (!parameters || typeof parameters !== 'object')
        return '';

    var result = MetaHub.extend({}, parameters);
    var query = '';
    MetaHub.extend(result, this.parameters);
    var glue = '?';
    for (var x in result) {
        query += glue + x + '=' + result[x];
        var glue = '&';
    }

    return query;
}
