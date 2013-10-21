var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", 'metahub', 'handlebars'], function(require, exports, __MetaHub__, __Handlebars__) {
    var MetaHub = __MetaHub__;

    var Handlebars = __Handlebars__;

    var Bloom;
    (function (Bloom) {
        Bloom.output = null;
        Bloom.ajax_prefix;
        Bloom.Wait_Animation;

        var Flower = (function (_super) {
            __extends(Flower, _super);
            function Flower(seed, element) {
                _super.call(this);
                this.seed_name = 'seed';
                this.seed = seed;
                this.element = element;

                this.listen(this, 'disconnect-all', function () {
                    if (this.element) {
                        this.element.remove();
                        this.element = null;
                    }
                });

                this.initialize();
            }
            Flower.prototype.initialize = function () {
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

            Flower.load_blocks_from_string = function (text) {
                var data = $(text);
                var blocks = Flower.blocks;
                data.children().each(function () {
                    var child = $(this);
                    var id = child.attr('name') || child[0].tagName.toLowerCase();
                    if (id) {
                        if (blocks[id])
                            console.log('Duplicate block tag name: ' + id + '.');

                        var block = blocks[id] = {
                            template: Handlebars.compile(this.outerHTML)
                        };

                        for (var i = 0; i < this.attributes.length; ++i) {
                            var attribute = this.attributes[i];
                            block[attribute.nodeName] = attribute.nodeValue;
                        }
                    } else {
                        console.log('Error with block tag name');
                    }
                });
            };

            Flower.find_flower = function (path) {
                var tokens = path.split('.');
                var result = Flower.namespace;
                for (var i = 0; i < tokens.length; ++i) {
                    var token = tokens[i];
                    result = result[token];
                    if (!result)
                        throw new Error('Invalid namespace path: ' + path);
                }

                return result;
            };

            Flower.prototype.grow = function () {
            };

            Flower.render_block = function (name, seed) {
                if (!Flower.blocks[name])
                    throw new Error('Could not find any flower block named: ' + name);

                var template = Flower.blocks[name].template;
                var source = template(seed);
                return $(source);
            };

            Flower.grow = function (element, seed) {
                var block, original = element, flower;

                var tagname = element[0].tagName.toLowerCase();
                if (Flower.blocks[tagname]) {
                    block = Flower.render_block(tagname, seed);
                    element.replaceWith(block);
                    element = block;
                }

                if (element.attr('flower')) {
                    var flower_type = Flower.find_flower(element.attr('flower'));
                    if (flower_type) {
                        flower = new flower_type(seed, element);
                    }
                }

                element.children().each(function (i, node) {
                    var child = $(node);
                    var bind = child.attr('bind');
                    var child_seed;
                    if (bind && seed[bind])
                        child_seed = seed[bind];
else
                        child_seed = seed;

                    var child = Flower.grow(child, child_seed);
                    if (block) {
                        child.detach();
                        element.append(child);
                    }
                });

                if (flower)
                    flower.grow();

                return element;
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

            Flower.prototype.empty = function () {
                this.disconnect_all('child');
                this.element.empty();
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
            Flower.blocks = {};
            return Flower;
        })(MetaHub.Meta_Object);
        Bloom.Flower = Flower;

        var List = (function (_super) {
            __extends(List, _super);
            function List(seed, element) {
                _super.call(this, seed, element);
                this.item_type = null;
                this.item_block = null;
                this.pager = null;
                this.empty_on_update = true;
                this.optimize_getter('children', 'child');
                this.listen(this, 'update', this.on_update);
                this.listen(this, 'connect.child', this.child_connected);
                this.listen(this, 'disconnect.child', this.remove_element);
                this.item_type = element.attr('item_type') || this.item_type;
                this.item_block = element.attr('item_block');
            }
            List.prototype.grow = function () {
                if (typeof this.seed == 'object') {
                    if (this.seed.is_meta_object)
                        this.watch_seed(this.seed);
else
                        this.populate(this.seed);
                }
            };

            List.prototype.add_seed_child = function (seed) {
                var flower, element, item_type = this.item_type;
                if (this.item_block) {
                    var block = Flower.render_block(this.item_block, seed);
                    element = Flower.grow(block, seed);
                    if (element.attr('flower')) {
                        var flower_type = Flower.find_flower(element.attr('flower'));
                        if (flower_type)
                            item_type = flower_type;
                    }
                }
                flower = new item_type(seed, element);
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

        var Irrigation = (function () {
            function Irrigation() {
            }
            Irrigation.path_array = function (path) {
                if (typeof path == 'object')
                    return path;

                if (!path || path.length == 0)
                    return [];
                if (path[0] == '/')
                    path = path.substring(1);
                if (path[path.length - 1] == '/')
                    path = path.substring(0, path.length - 1);
                return path.split('/');
            };
            return Irrigation;
        })();
        Bloom.Irrigation = Irrigation;

        function get(url, action, error, wait_parent) {
            if (typeof error === "undefined") { error = null; }
            if (typeof wait_parent === "undefined") { wait_parent = null; }
            var wait;

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

        function join() {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            var i, tokens = [];
            for (i = 0; i < args.length; ++i) {
                var x = args[i];
                if (typeof x === 'number')
                    x = x.toString();
else if (typeof x !== 'string' || x.length === 0)
                    continue;

                x = x.replace(/^\/*/, '');
                x = x.replace(/\/*$/, '');

                if (x.length === 0)
                    continue;

                tokens.push(x);
            }

            if (tokens.length === 0)
                return '';

            if (tokens.length > 1 && tokens[tokens.length - 1][0] == '?') {
                tokens[tokens.length - 2] += tokens.pop();
            }

            var result = tokens.join('/');

            if (args[0][0] == '/')
                result = '/' + result;

            return result;
        }
        Bloom.join = join;
    })(Bloom || (Bloom = {}));

    
    return Bloom;
});
//# sourceMappingURL=bloom.js.map
