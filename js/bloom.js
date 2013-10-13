/**
* Created with JetBrains PhpStorm.
* User: cj
* Date: 10/9/13
* Time: 11:48 PM
* To change this template use File | Settings | File Templates.
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", 'metahub'], function(require, exports, __MetaHub__) {
    /// <reference path="../defs/jquery.d.ts" />
    /// <reference path="metahub.ts" />
    var MetaHub = __MetaHub__;

    var Bloom = (function () {
        function Bloom() {
        }
        Bloom.join = function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            var i, args = [];
            for (i = 0; i < args; ++i) {
                var x = args[i];
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

            for (i = 0; i < args.length - 1; ++i) {
                var x = args[i];
                if (x[x.length - 1] == '/') {
                    args[i] = x.substring(0, x.length - 1);
                }
            }

            if (args.length > 1 && args[args.length - 1][0] == '?') {
                args[args.length - 2] += args.pop();
            }

            return args.join('/');
        };
        return Bloom;
    })();

    var Bloom;
    (function (Bloom) {
        Bloom.output = null;
        Bloom.ajax_prefix;
        Bloom.Wait_Animation;

        var Block = (function () {
            function Block(name, html) {
                if (typeof html === "undefined") { html = ''; }
                this.name = name;
                Block.library[name] = this;
                if (html != null)
                    this.html = html;
else
                    this.html = '';
            }
            Block.load = function (name, onload) {
                //      var block = Block.library[name];
                //
                //      if (!block) {
                //        block = new Block(name);
                //        block.queue = [];
                //        var url = name + Block.default_extension
                //        if (Block.source_path.length > 0)
                //          url = Block.source_path + "/" + url;
                //
                //        jQuery.ajax({
                //          url: url,
                //          success: function (seed) {
                //            block.html = seed;
                //            for (var x = 0; x < block.queue.length; x++) {
                //              block.queue[x](block);
                //            }
                //            delete block.queue;
                //            Mulch.till('block', name);
                //          }, error: function (jqXHR, text, error) {
                //            var message = 'Could not load ' + name + Block.default_extension + '.';
                //            delete Block.library[name];
                //            console.log(message);
                //            Mulch.till('block', name);
                //          }
                //        });
                //
                //        if (typeof onload == 'function') {
                //          block.queue.push(onload);
                //        }
                //      }
                //      else if (typeof onload == 'function') {
                //        if (block.html == '') {
                //          block.queue.push(onload);
                //        }
                //        else {
                //          onload(block);
                //          return;
                //        }
                //      }
            };

            Block.load_library = function (name, onload) {
                //      var url = name + Block.default_extension
                //      if (Block.source_path.length > 0)
                //        url = Block.source_path + "/" + url;
                //      jQuery.ajax({
                //        url: url,
                //        success: function (seed) {
                //          Block.load_library_from_string(seed);
                //          Mulch.till('blocks', name);
                //        },
                //        error: function (jqXHR, text, error) {
                //          var message = 'Could not load ' + name + Block.default_extension + '.';
                //          if (Block.use_alert) {
                //            alert(message);
                //          }
                //          console.log(message);
                //          Mulch.till('block', name);
                //        }
                //      });
                //
                //      if (typeof onload == 'function') {
                //        block.queue.push(onload);
                //      }
            };

            Block.load_library_from_string = function (text) {
                var data = $(text);
                data.children().each(function () {
                    var child = $(this);
                    var id = child.attr('name');
                    if (id)
                        child.removeAttr('name');
else
                        id = child.attr('id');

                    if (id) {
                        new Block(id, this.outerHTML);
                    } else {
                        console.log('Block was missing name or id attribute');
                    }
                });
            };

            Block.render = function (name, seed) {
                return Block.library[name].render(seed);
            };

            Block.prototype.render = function (control) {
                var output = this.html;

                output = output.replace(/@{([\W\w]*?)}(?=\s*(?:<|"))/gm, function (all, code) {
                    var result = eval(code);
                    if (typeof result === "undefined" || result == null)
                        return '';

                    return result;
                });

                var result = $(output);
                return result;
            };
            Block.library = {};
            Block.default_extension = '.html';
            Block.source_path = "";
            return Block;
        })();
        Bloom.Block = Block;

        var Flower = (function (_super) {
            __extends(Flower, _super);
            function Flower(seed, element, block) {
                _super.call(this);
                this.override_parameters = false;
                this.autobind = true;
                // Returns a url string to the service from which this object receives its data.
                //    query: function() {},
                // Name of the property of the query response that contains the actual object data.
                this.seed_name = 'seed';
                this.seed = seed;
                this.element = element;
                this.block = block || this.block;

                if (!this.element && this.block) {
                    // Don't pass onload to render() because if one was provided to create(), it will
                    // be handled later.
                    this.render();
                } else if (this.autobind) {
                    this.source_to_element();
                }

                this.listen(this, 'disconnect-all', function () {
                    if (this.element) {
                        this.element.remove();
                        this.element = null;
                    }
                });
            }
            Flower.prototype.render = function (onload) {
                if (typeof onload === "undefined") { onload = null; }
                var block = Block.library[this.block];
                if (!block)
                    throw new Error("Block '" + this.block + "' not found.");

                this.element = block.render(this);
                if (this.element.length == 0) {
                    throw new Error('this.element is empty!');
                }
                if (this.autobind)
                    this.source_to_element();

                if (typeof onload == 'function')
                    onload(this);
                //});
            };

            Flower.prototype.append = function (flower) {
                this.element.append(flower.element);
            };

            Flower.prototype.listen_to_element = function (event, method) {
                var self = this;

                this.element.bind(event, function () {
                    method.apply(self, arguments);
                });
            };

            Flower.prototype.get_data = function () {
                var args = Array.prototype.slice.call(arguments);
                var method = args.pop();
                jQuery.get(args, function () {
                    var args = Array.prototype.slice.call(arguments);
                    args.push('json');
                    method.apply(this, args);
                });
            };

            Flower.prototype.plant = function (url) {
                jQuery.post(url, this.seed, function (response) {
                    if (!response.result) {
                        Bloom.output('There was a problem communicating with the server.');
                        return;
                    }
                    if (response.result.toLowerCase() == 'success') {
                        this.invoke('plant.success', response);
                    } else
                        this.invoke('plant.error', response);
                });
            };

            Flower.prototype.click = function (action, meta_object) {
                if (!meta_object) {
                    meta_object = this;
                }
                this.element.click(function (event) {
                    event.preventDefault();
                    action.call(meta_object, event);
                });
            };

            Flower.prototype.source_to_element = function () {
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
                        } else {
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
                        } else {
                            value = property;
                        }

                        if (typeof value != 'object') {
                            Flower.set_value(element, value);
                        }
                    }
                }
            };

            Flower.prototype.element_to_source = function () {
                for (var name in this.seed) {
                    var element = this.element.find('#' + name + ':input, .' + name + ':input, [bind=' + name + ']:input');
                    if (element.length > 1) {
                        throw new Error('Too many selectors for property: ' + name + '.');
                    } else if (element.length == 1) {
                        if (typeof this.seed[name] != 'function' && Flower.is_input(element)) {
                            this.seed[name] = element.val();
                        }
                    }
                }
            };

            Flower.prototype.empty = function () {
                this.disconnect_all('child');
                this.element.empty();
            };

            Flower.prototype.graft_old = function (selector, other) {
                var element = this.element.find(selector);
                this.listen(other, 'change', function (value) {
                    Flower.set_value(element, value);
                });

                Flower.set_value(element, other.value);
            };

            Flower.prototype.graft = function (other, property, selector) {
                if (selector === undefined) {
                    selector = '.' + property.replace('_', '-');
                }
                var element = this.element.find(selector);
                this.listen(other, 'change.' + property, function (value) {
                    Flower.set_value(element, value);
                });

                Flower.set_value(element, other[property]);
            };

            Flower.prototype.update = function (test) {
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
                });
            };

            Flower.set_value = function (elements, value) {
                elements.each(function () {
                    var element = $(this);
                    if (Flower.is_input(element)) {
                        if (element.attr('type') == 'checkbox') {
                            if (value === true || value === 'true')
                                element.attr('checked', 'checked');
else
                                element.removeAttr('checked');
                        } else {
                            element.val(value);
                        }
                    } else {
                        element.html(value);
                    }
                });
            };

            Flower.get_value = function (element) {
                if (Flower.is_input(element)) {
                    if (element.attr('type') == 'checkbox') {
                        return element.prop('checked', true);
                    } else {
                        return element.val();
                    }
                } else {
                    return element.text();
                }
            };

            Flower.is_input = function (element) {
                if (element.length == 0)
                    return false;
                var name = element[0].nodeName.toLowerCase();
                return name == 'input' || name == 'select' || name == 'textarea';
            };
            return Flower;
        })(MetaHub.Meta_Object);
        Bloom.Flower = Flower;

        new Block('list', '<ul></ul>');

        var List = (function (_super) {
            __extends(List, _super);
            function List(seed, element, block) {
                _super.call(this, seed, element, block);
                // List did not used to define a default block because blocks used to override
                // existing jQuery elements/selectors passed to the constructer.  Now that that
                // is not the case it is safe to have this default.
                this.block = 'list';
                this.item_type = null;
                this.pager = null;
                this.empty_on_update = true;
                this.optimize_getter('children', 'child');
                this.listen(this, 'update', this.on_update);
                this.listen(this, 'connect.child', this.child_connected);
                this.listen(this, 'disconnect.child', this.remove_element);
                if (typeof this.seed == 'object') {
                    if (this.seed.is_meta_object)
                        this.watch_seed(this.seed);
else
                        this.populate(this.seed);
                }
            }
            List.prototype.add_seed_child = function (seed_item) {
                var flower;
                flower = new this.item_type(seed_item);
                this.connect(flower, 'child', 'parent');
                return flower;
            };

            List.prototype.child_connected = function (flower) {
                var line;
                if (flower.element[0].nodeName.toLowerCase() == 'li' || this.element.prop('tagName') != 'UL') {
                    line = flower.element;
                } else {
                    line = jQuery('<li></li>');
                    line.append(flower.element);
                }
                this.element.append(line);
                if (this.selection) {
                    List.make_item_selectable(this, flower, this.selection);
                }
            };

            List.prototype.process_connect = function (other, type, other_type) {
                if (type == 'child' && this.contains_flower(other))
                    return false;
            };

            List.prototype.on_update = function (seed) {
                var self = this;

                if (!this.element) {
                    throw Error('element is null!');
                }

                if (this.empty_on_update || !this.seed) {
                    this.empty();
                    this.seed = seed;
                } else {
                    this.seed = this.seed.concat(seed);
                }

                this.load(seed);
            };

            List.prototype.contains_flower = function (flower) {
                return this.element.has(flower.element[0]).length > 0;
            };

            //    make_selectable(selection) {
            //      if (selection == undefined)
            //        this.selection = Meta_Object.create();
            //      else
            //        this.selection = selection;
            //
            //      for (var x = 0; x < this.children.length; x++) {
            //        List.make_item_selectable(this, this.children[x], selection);
            //      }
            //    }
            List.prototype.load = function (seed) {
                seed = seed || this.seed;
                this.populate(seed);
                this.invoke('updated', seed);
            };

            List.prototype.populate = function (seed) {
                var x;
                if (seed.is_meta_object) {
                    var children = seed.get_connections('child');
                    for (x = 0; x < children.length; ++x) {
                        this.add_seed_child(children[x]);
                    }
                } else if (MetaHub.is_array(seed)) {
                    for (x = 0; x < seed.length; ++x) {
                        this.add_seed_child(seed[x]);
                    }
                } else {
                    for (x in seed) {
                        this.add_seed_child(seed[x]);
                    }
                }
            };

            List.prototype.remove = function (item) {
                if (item.element && item.element.parent() == this || (item.element.parent() && item.element.parent().parent() == this)) {
                    item.element.detach();
                }
                this.disconnect(item);
            };

            List.prototype.remove_element = function (item) {
                if (item.element) {
                    if (item.element.parent()[0] == this.element[0]) {
                        item.element.detach();
                    } else if (item.element.parent() && item.element.parent().parent()[0] == this.element[0]) {
                        var temp = item.element.parent();
                        item.element.detach();
                        temp.remove();
                    }
                }
            };

            List.prototype.watch_seed = function (child_name, seed) {
                if (typeof seed === "undefined") { seed = undefined; }
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
            };

            List.make_item_selectable = function (list, item, selection) {
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
            };
            return List;
        })(Flower);
        Bloom.List = List;

        function get(url, action, error, wait_parent) {
            if (typeof error === "undefined") { error = null; }
            if (typeof wait_parent === "undefined") { wait_parent = null; }
            var wait;

            //    if (Bloom.ajax_prefix) {
            //      url = Bloom.join(Bloom.ajax_prefix, url);
            //    }
            var success = function (response) {
                try  {
                    var json = JSON.parse(response);
                } catch (e) {
                    console.log('There was a problem parsing the server response in Bloom.get');
                    console.log(e.message);
                }
                if (json.success === false || json.success === 'false') {
                    Bloom.output(json);
                    if (typeof error == 'function') {
                        error(json, response);
                    }
                } else {
                    action(json);

                    if (typeof Bloom.output == 'function' && json && typeof json.message == 'string') {
                        Bloom.output(json);
                    }
                }
            };

            var settings = {
                type: 'GET',
                url: url,
                success: success,
                error: error,
                dataType: 'text',
                complete: undefined
            };
            if (wait_parent && Bloom.Wait_Animation) {
                wait = Bloom.Wait_Animation.create();
                wait_parent.append(wait.element);
                settings.complete = function () {
                    if (wait)
                        wait.element.remove();
                };
            }

            jQuery.ajax(settings);
        }
        Bloom.get = get;

        function post(url, seed, success, error, wait_parent) {
            var wait;
            if (success === undefined) {
                success = seed;
                seed = null;
            }

            if (Bloom.ajax_prefix) {
                url = Bloom.ajax_prefix + url;
            }

            var action = function (response) {
                if (success) {
                    success(response);
                }

                if (typeof Bloom.output == 'function') {
                    Bloom.output(response);
                }
            };
            var settings = {
                type: 'POST',
                url: url,
                data: seed,
                success: action,
                error: error,
                complete: function () {
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
                };
            }

            jQuery.ajax(settings);
        }
        Bloom.post = post;

        function post_json(url, seed, success, error) {
            if (Bloom.ajax_prefix) {
                url = Bloom.ajax_prefix + url;
            }

            var action = function (response) {
                var good = true;

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
        Bloom.post_json = post_json;

        function get_url_property(name) {
            return Bloom.get_url_properties()[name];
        }
        Bloom.get_url_property = get_url_property;

        function get_url_properties(source) {
            if (typeof source === "undefined") { source = null; }
            var result = {}, text;
            if (source !== undefined)
                text = source;
else
                text = window.location.search;

            var items = text.slice(1).split(/[\&=]/);
            if (items.length < 2)
                return {};

            for (var x = 0; x < items.length; x += 2) {
                result[items[x]] = decodeURIComponent(items[x + 1].replace(/\+/g, ' '));
            }

            //  }
            return result;
        }
        Bloom.get_url_properties = get_url_properties;

        function edit_text(element, finished) {
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
        }
        Bloom.edit_text = edit_text;
        ;

        function watch_input(input, action, delay) {
            if (typeof delay === "undefined") { delay = null; }
            if (!delay && delay !== 0)
                delay = 800;
            var timer = null;

            var finished = function (event) {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                action(input.val(), event);
            };

            input.change(function (event) {
                finished(event);
            });

            input.keypress(function (event) {
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
        }
        Bloom.watch_input = watch_input;
        ;

        function bind_input(input, owner, name, source) {
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
        Bloom.bind_input = bind_input;

        function render_query(parameters) {
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
        Bloom.render_query = render_query;
    })(Bloom || (Bloom = {}));

    
    return Bloom;
});
//# sourceMappingURL=bloom.js.map
