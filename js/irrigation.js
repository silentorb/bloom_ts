/**
* User: Chris Johnson
* Date: 10/13/13
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", 'metahub'], function(require, exports, __MetaHub__) {
    /// <reference path="../defs/metahub.d.ts" />
    /// <reference path="bloom.ts" />
    var MetaHub = __MetaHub__;

    var Bloom;
    (function (Bloom) {
        var Irrigation = (function (_super) {
            __extends(Irrigation, _super);
            function Irrigation() {
                _super.call(this);
                this.app_path = '';
                this.page_path = '';
                this.trellis_plots = {};
                this.channels = [];
                this.parameters = {
                    trellis: 'trellis',
                    id: 'int',
                    action: 'string'
                };
            }
            //    vineyard:Vineyard null
            //    initialize_vineyard (vineyard) {
            //      this.vineyard = vineyard;
            //      this.add_channel(['%trellis', '%id', '%action?']);
            //      this.add_channel(['%trellis', '%action?']);
            //    }
            Irrigation.prototype.add_channel = function (pattern, action) {
                pattern = Irrigation.convert_path_to_array(pattern);
                var priority = this.calculate_priority(pattern);
                var i, channel, result = {
                    pattern: pattern,
                    action: action,
                    priority: priority
                };

                for (i = 0; i < this.channels.length; ++i) {
                    channel = this.channels[i];
                    if (channel.priority < priority)
                        break;
                }
                this.channels.splice(i, 0, result);

                return result;
            };

            Irrigation.prototype.apply_pattern = function (pattern, path) {
                if (typeof path !== 'object')
                    throw new Error('path must be an array');

                if (typeof pattern !== 'object')
                    throw new Error('channel must be an array');

                //    if (path.length !== channel.length)
                //      throw new Error('Irrigation.apply_pattern() requires a path and channel with the same length. (path.length = ' +
                //        path.length + '. channel.length = ' + channel.length + '.)');
                var processed_pattern = this.compare(pattern, path);
                if (!processed_pattern)
                    throw new Error('Pattern/path mismatch: ' + pattern.join('/') + ' != ' + path.join('/'));

                //    console.log('pattern', processed_pattern)
                var result = {};
                for (var i = 0; i < path.length; ++i) {
                    var part = processed_pattern[i];
                    if (part[0] == '%') {
                        var type = part.substring(1);
                        result[type] = this.convert_value(path[i], type);
                    }
                }

                return result;
            };

            Irrigation.prototype.calculate_priority = function (path) {
                var bindings = 0;
                for (var i = 0; i < path.length; ++i) {
                    if (path[i][0] == '%') {
                        bindings += 2;
                        var type = this.parameters[path[i].substring(1)];
                        if (type && type != 'string')
                            ++bindings;
                    }
                }

                return bindings + (path.length * 2);
            };

            Irrigation.prototype.compare = function (primary, secondary) {
                var a = Irrigation.convert_path_to_array(primary);
                var b = Irrigation.convert_path_to_array(secondary);
                var result = [];

                if (a.length < b.length)
                    return false;

                var length = Math.max(a.length, b.length);

                var x = -1, y = -1, ax, by, ax_pure;
                for (var i = 0; i < length; i++) {
                    if (++x >= a.length)
                        return false;

                    ax = a[x];

                    if (++y >= b.length) {
                        if (ax[ax.length - 1] == '?') {
                            --y;
                            continue;
                        } else
                            return false;
                    }

                    by = b[y];
                    ax_pure = ax.replace(/\?$/, '');

                    if (ax_pure == by || ax == '*' || (ax[0] == '%' && this.compare_parts(ax_pure, by))) {
                        result.push(ax_pure);
                        continue;
                    }

                    if (ax[ax.length - 1] == '?') {
                        --y;
                        continue;
                    }

                    return false;
                }

                return result;
            };

            Irrigation.prototype.compare_parts = function (name, value) {
                var type = this.parameters[name.substring(1)];
                if (this.convert_value(value, type) === null)
                    return false;
else
                    return true;
            };

            Irrigation.prototype.convert_value = function (value, type) {
                switch (type) {
                    case 'trellis':
                        return this.get_trellis(value);
                    case 'int':
                        if (!value.toString().match(/\d+/))
                            return null;
                        return parseInt(value);
                    case 'string':
                        return value.toString();
                }

                return value;
            };

            Irrigation.prototype.determine_action = function (request) {
                if (request.action)
                    return request.action;

                return 'other';
            };

            Irrigation.prototype.find_channel = function (path) {
                for (var i = 0; i < this.channels.length; i++) {
                    var channel = this.channels[i];
                    if (this.compare(channel.pattern, path)) {
                        return channel;
                    }
                }

                return null;
            };

            // Eventually parameters will be passed to this, but right now it's very simple.
            Irrigation.prototype.get_channel = function (type) {
                if (type == 'seed')
                    return 'vineyard';
                if (type == 'page')
                    return this.page_path;
                throw new Error(type + ' is not a valid channel type.');
            };

            Irrigation.prototype.get_destination = function (request) {
                var id = request.parameters.id || request.id;
                if (request.trellis) {
                    if (request.action == 'create') {
                        return 'create';
                    } else if (id) {
                        return 'view';
                    } else {
                        return 'index';
                    }
                } else {
                    'other';
                }
            };

            Irrigation.prototype.get_plant_url = function () {
                var channel = this.get_channel('seed');
                return Bloom.join(this.app_path, channel, 'update');
            };

            Irrigation.prototype.get_plot = function (trellis) {
                if (this.trellis_plots[trellis])
                    return this.trellis_plots[trellis];

                return null;
            };

            Irrigation.prototype.url = function (trellis_or_seed, id, action, args) {
                var trellis;

                if (!trellis_or_seed)
                    throw new Error('Invalid first argument');

                if (typeof trellis_or_seed == 'string') {
                    trellis = trellis_or_seed;
                } else {
                    var seed = trellis_or_seed;
                    var trellis = (seed.trellis && seed.trellis.name) || seed.type;
                    if (!trellis)
                        throw new Error('Invalid seed.');

                    args = action;
                    action = id;
                    if (seed.trellis && seed.trellis.primary_key)
                        id = seed[seed.trellis.primary_key];
                }

                // Allow hooks to override the arguments.
                var data = {
                    trellis: trellis,
                    id: id,
                    pre: null,
                    post: null,
                    action: action,
                    args: args
                };
                if (trellis) {
                    this.invoke('url.' + trellis, data, seed);
                }

                return Bloom.join(this.app_path, data.pre, data.trellis, data.id, data.action, data.post) + Bloom.render_query(data.args);
            };

            Irrigation.prototype.get_request = function () {
                return this.get_request_from_string(window.location.pathname);
            };

            Irrigation.prototype.get_request_from_string = function (path_string, ignore_browser_args) {
                if (typeof ignore_browser_args === "undefined") { ignore_browser_args = false; }
                var args, path;
                var query_index = path_string.indexOf('?');
                if (ignore_browser_args)
                    args = '';

                if (query_index > -1) {
                    args = path_string.substring(query_index);
                    path_string = path_string.substring(0, query_index);
                }

                path = Irrigation.get_path_array(path_string, Bloom.join(this.app_path, this.page_path));

                var request = {
                    parameters: Bloom.get_url_properties(args),
                    path: path
                };

                var channel = this.find_channel(path);
                if (channel) {
                    MetaHub.extend(request, this.apply_pattern(channel.pattern, path));

                    if (typeof channel.action === 'function')
                        MetaHub.extend(request, channel.action(path));
                } else {
                    if (path.length > 1) {
                        if (path.length > 2) {
                            request.id = path[1];
                            request.action = path[2];
                        } else {
                            if (path[1].match(/\d+/))
                                request.id = path[1];
else
                                request.action = path[1];
                        }
                    }
                    if (request.id === undefined && request.parameters.id !== undefined)
                        request.id = request.parameters.id;
                }

                request.path_string = request.path.join('/');
                return request;
            };

            Irrigation.prototype.get_trellis = function (name) {
                throw new Error('not implemented.');
                //      if (this.vineyard.trellises[name])
                //        return name;
                ////            return this.vineyard.trellises[name];
                //      return null;
            };

            Irrigation.convert_path_to_array = function (path) {
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

            Irrigation.get_path_array = function (path, base) {
                path = Irrigation.convert_path_to_array(path);
                base = Irrigation.convert_path_to_array(base);
                for (var i = 0; i < base.length; i++) {
                    if (i >= path.length)
                        break;
                    if (path[i] == base[i]) {
                        path.splice(i, 1);
                        base.splice(i, 1);
                        --i;
                    }
                }

                return path;
            };
            return Irrigation;
        })(MetaHub.Meta_Object);
        Bloom.Irrigation = Irrigation;
    })(Bloom || (Bloom = {}));
});
//# sourceMappingURL=irrigation.js.map
