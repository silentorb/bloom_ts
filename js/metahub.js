/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
var MetaHub;
(function (MetaHub) {
    function remove(array, item) {
        if (typeof array.indexOf != 'function')
            return;

        var index = array.indexOf(item);
        if (index != -1)
            array.splice(index, 1);
    }
    MetaHub.remove = remove;

    function has_properties(obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key))
                return true;
        }
        return false;
    }
    MetaHub.has_properties = has_properties;
    ;

    function is_array(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }
    MetaHub.is_array = is_array;

    function size(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key))
                size++;
        }
        return size;
    }
    MetaHub.size = size;
    ;

    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    MetaHub.S4 = S4;

    function values(source) {
        return Object.keys(source).map(function (key) {
            return source[key];
        });
    }
    MetaHub.values = values;

    function concat(destination, source) {
        var result = {};
        for (var a in destination) {
            result[a] = destination[a];
        }

        for (var b in source) {
            result[b] = source[b];
        }

        return result;
    }
    MetaHub.concat = concat;

    function extend(destination, source, names) {
        if (typeof names === "undefined") { names = null; }
        var info;

        if (typeof source == 'object' || typeof source == 'function') {
            if (names == null)
                names = Object.getOwnPropertyNames(source);

            for (var k = 0; k < names.length; ++k) {
                var name = names[k];
                if (source.hasOwnProperty(name)) {
                    if (typeof Object.getOwnPropertyDescriptor == 'function') {
                        info = Object.getOwnPropertyDescriptor(source, name);

                        if (info.get) {
                            Object.defineProperty(destination, name, info);
                            continue;
                        }
                    }

                    if (source[name] === null)
                        destination[name] = null;
else if (MetaHub.is_array(source[name]) && source[name].length == 0)
                        destination[name] = [];
else if (typeof source[name] == 'object' && !MetaHub.has_properties(source[name]))
                        destination[name] = {};
else
                        destination[name] = source[name];
                    //              else
                    //                info.value = source[name];
                    //              Object.defineProperty(destination, name, info);
                    //            }
                }
            }
        }
        return destination;
    }
    MetaHub.extend = extend;

    // Pseudo GUID
    function guid() {
        return S4() + S4() + "-" + S4() + "-" + S4();
    }
    MetaHub.guid = guid;

    function clone(source, names) {
        var result = {};
        MetaHub.extend(result, source, names);
        return result;
    }
    MetaHub.clone = clone;

    function get_connection(a, b) {
        for (var x = 0; x < a.internal_connections.length; x++) {
            if (a.internal_connections[x].other === b) {
                return a.internal_connections[x];
            }
        }

        return null;
    }
    MetaHub.get_connection = get_connection;

    function filter(source, check) {
        var result = {};
        for (var key in source) {
            if (check(source[key], key, source))
                result[key] = source[key];
        }

        return result;
    }
    MetaHub.filter = filter;

    function map(source, action) {
        var result = {};
        for (var key in source) {
            result[key] = action(source[key], key, source);
        }

        return result;
    }
    MetaHub.map = map;

    function map_to_array(source, action) {
        var result = [];
        for (var key in source) {
            result.push(action(source[key], key, source));
        }
        return result;
    }
    MetaHub.map_to_array = map_to_array;

    //  function get_variables(source) {
    //    var result = {};
    //    if (typeof source == 'object' || typeof source == 'function') {
    //      for (var k in source) {
    //        if (source.hasOwnProperty(k) && typeof source[k] != 'function') {
    //          result[k] = source[k];
    //        }
    //      }
    //    }
    //    return result;
    //  }
    //  function serialize(source) {
    //    if (source.original_properties) {
    //      var temp = {};
    //      MetaHub.extend(temp, source, source.original_properties);
    //      return JSON.stringify(temp);
    //      //return JSON.stringify(source, source.original_properties);
    //    }
    //    else {
    //      return JSON.stringify(source);
    //    }
    //  };
    var Meta_Object = (function () {
        function Meta_Object() {
            this.is_meta_object = true;
            this.events = {};
            this.internal_connections = new Array();
        }
        Meta_Object.connect_objects = function (first, other, type) {
            var connection = MetaHub.get_connection(first, other);
            if (connection) {
                if (connection.type != type && type) {
                    connection.type = type;
                    return true;
                }

                return false;
            }

            if (type === 'parent')
                first.parent = other;

            connection = new Meta_Connection(first, other, type);
            first.internal_connections.push(connection);
            return true;
        };

        Meta_Object.disconnect_objects = function (first, other) {
            var connection = MetaHub.get_connection(first, other);
            if (connection) {
                var type = connection.type;
                MetaHub.remove(first.internal_connections, connection);

                for (var event in other.events) {
                    first.unlisten(other, event);
                }

                connection.parent = null;
                connection.other = null;

                first.invoke('disconnect.' + type, other, first);

                if (connection.type === 'parent') {
                    var parents = first.get_connections('parent');
                    if (parents.length == 0) {
                        delete first.parent;
                        if (!first.__disconnecting_everything) {
                            first.disconnect_all();
                        }
                    } else {
                        first.parent = parents[0];
                    }
                }
            }
        };

        Meta_Object.has_property = function (target, name) {
            var x, names = name.split('.');
            for (x = 0; x < names.length; x++) {
                if (!target.hasOwnProperty(names[x]))
                    return false;

                target = target[names[x]];
            }

            return true;
        };

        Meta_Object.invoke_binding = function (source, owner, name) {
            if (!owner.events[name])
                return;

            var args = Array.prototype.slice.call(arguments, 3);
            var info = owner.events[name], length = info.length;
            for (var x = 0; x < length; ++x) {
                var binding = info[x], listener = binding.listener;

                if (listener !== source && listener) {
                    binding.method.apply(listener, args);
                }
            }
        };

        //       toString () {
        //        return this.meta_source + ":" + this.guid;
        //      };
        Meta_Object.prototype.listen = function (other, name, method, options) {
            if (typeof options === "undefined") { options = null; }
            if (typeof method !== 'function')
                throw new Error('Meta_Object.listen requires the passed method to be a function, not a "' + typeof method + '"');

            if (other !== this) {
                if (!other.is_meta_object) {
                    this.connect(other, '');
                }
            }

            if (other.events[name] == null)
                other.events[name] = [];

            var event = {
                method: method,
                listener: this,
                async: false
            };

            if (typeof options == 'object') {
                if (options.once) {
                    event.method = function () {
                        MetaHub.remove(other.events[name], event);
                        method.apply(this, Array.prototype.slice.call(arguments));
                    };
                }
                if (options.async) {
                    event.async = true;
                }
            }

            if (options && options.first)
                other.events[name].unshift(event);
else
                other.events[name].push(event);
        };

        Meta_Object.prototype.unlisten = function (other, name) {
            if (other.events[name] == null)
                return;

            var list = other.events[name];
            for (var i = list.length - 1; i >= 0; --i) {
                if (list[i].listener === this) {
                    list.splice(i, 1);
                }
            }

            if (list.length == 0) {
                delete other.events[name];
            }
        };

        Meta_Object.prototype.invoke = function (name) {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            if (!this.events[name])
                return;

            var info = this.events[name];
            for (var x = 0; x < info.length; ++x) {
                info[x].method.apply(info[x].listener, args);
            }
        };

        Meta_Object.prototype.invoke_async = function (name) {
            var args = Array.prototype.slice.call(arguments, 1);
            var finish = args[args.length - 1];
            if (!this.events[name]) {
                if (typeof finish == 'function')
                    finish.apply(this, args.slice(0, args.length - 1));
                return;
            }

            var info = this.events[name];
            var loop = function (x) {
                if (x < info.length) {
                    // Use this eventually:
                    // args[args.length - 1] = loop.bind(this, x + 1);
                    args[args.length - 1] = function () {
                        loop(x + 1);
                    };
                    info[x].method.apply(info[x].listener, args);
                } else {
                    if (typeof finish == 'function')
                        finish.apply(this, args.slice(0, args.length - 1));
                }
            };
            loop(0);
        };

        Meta_Object.prototype.gather = function (name) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (!this.events[name])
                return args[0];

            var info = this.events[name];
            for (var x = 0; x < info.length; ++x) {
                args[0] = info[x].method.apply(info[x].listener, args);
            }
            return args[0];
        };

        Meta_Object.prototype.connect = function (other, type, other_type) {
            if (typeof other_type === "undefined") { other_type = undefined; }
            if (other_type == undefined)
                other_type = type;

            if (!other.is_meta_object)
                return;

            if (!Meta_Object.connect_objects(this, other, type)) {
                return;
            }

            Meta_Object.connect_objects(other, this, other_type);

            this.invoke('connect.' + type, other, this);
            other.invoke('connect.' + other_type, this, other);
        };

        Meta_Object.prototype.disconnect = function (other) {
            Meta_Object.disconnect_objects(this, other);
            Meta_Object.disconnect_objects(other, this);
        };

        Meta_Object.prototype.disconnect_all = function (type) {
            if (type == undefined) {
                for (var x = this.internal_connections.length - 1; x >= 0; --x) {
                    this.disconnect(this.internal_connections[x].other);
                }
                this.internal_connections = [];
                this.invoke('disconnect-all', this);
            } else {
                var connections = this.get_connections(type);
                for (var x = connections.length - 1; x >= 0; --x) {
                    this.disconnect(connections[x]);
                }
            }
            //      delete this.__disconnecting_everything;
        };

        Meta_Object.prototype.is_listening = function (other, name) {
            if (!other.is_meta_object)
                return false;

            for (var x in other.events[name]) {
                if (other.events[name][x].listener === this)
                    return true;
            }
            return false;
        };

        // This function is long and complicated because it is a heavy hitter both in usefulness
        // and performance cost.
        Meta_Object.prototype.get_connections = function () {
            var filters = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                filters[_i] = arguments[_i + 0];
            }
            var x;
            var first_filter = filters.shift();

            var result = [];
            if (typeof first_filter == 'string') {
                for (x = 0; x < this.internal_connections.length; x++) {
                    if (this.internal_connections[x].type == first_filter) {
                        result.push(this.internal_connections[x].other);
                    }
                }
            } else if (typeof first_filter == 'function') {
                for (x = 0; x < this.internal_connections.length; x++) {
                    if (first_filter(this.internal_connections[x].other)) {
                        result.push(this.internal_connections[x].other);
                    }
                }
            }

            for (var f = 0; f < filters.length; f++) {
                var filter = filters[f];

                if (typeof filter == 'string') {
                    for (x = result.length - 1; x >= 0; x--) {
                        if (this.internal_connections[result[x]].type != filter) {
                            result.splice(x, 1);
                        }
                    }
                } else if (typeof filter == 'function') {
                    for (x = result.length - 1; x >= 0; x--) {
                        if (!filter(result[x])) {
                            result.splice(x, 1);
                        }
                    }
                }
            }

            return result;
        };

        Meta_Object.prototype.get_connection = function (filter) {
            return this.get_connections(filter)[0];
        };

        Meta_Object.prototype.define_connection_getter = function (property_name, connection_name) {
            this[property_name] = function (filter) {
                return this.get_connections(connection_name, filter);
            };
        };

        Meta_Object.prototype.define_object = function (property_name, connection_name) {
            var property = {};
            this[property_name] = property;

            this.listen(this, 'connect.' + connection_name, function (item) {
                property[item.name] = item;
            });

            this.listen(this, 'disconnect.' + connection_name, function (item) {
                delete property[item];
            });
        };

        Meta_Object.prototype.optimize_getter = function (property_name, connection_name) {
            var array = [];
            this[property_name] = array;

            this.listen(this, 'connect.' + connection_name, function (item) {
                array.push(item);
            });

            this.listen(this, 'disconnect.' + connection_name, function (item) {
                MetaHub.remove(array, item);
            });
        };
        return Meta_Object;
    })();
    MetaHub.Meta_Object = Meta_Object;

    var Meta_Connection = (function () {
        function Meta_Connection(parent, other, type) {
            this.type = '';
            this.parent = parent;
            this.other = other;
            this.type = type;
        }
        return Meta_Connection;
    })();
    MetaHub.Meta_Connection = Meta_Connection;
})(MetaHub || (MetaHub = {}));

module.exports = MetaHub;
//# sourceMappingURL=metahub.js.map
