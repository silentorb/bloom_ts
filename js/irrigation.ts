/// <reference path="../defs/metahub.d.ts" />
/// <reference path="bloom.d.ts" />

import MetaHub = require('metahub')

export interface IRequest {
  id?
  action?
  parameters?
  path?
  path_string?
}

export class Irrigation extends MetaHub.Meta_Object {
  app_path:string = ''
  page_path:string = ''
  trellis_plots = {}
  channels:any [] = []
  parameters

  constructor() {
    super()
    this.parameters = {
      trellis: 'trellis',
      id: 'int',
      action: 'string'
    }
  }

//    vineyard:Vineyard null

//    initialize_vineyard (vineyard) {
//      this.vineyard = vineyard;
//      this.add_channel(['%trellis', '%id', '%action?']);
//      this.add_channel(['%trellis', '%action?']);
//    }

  add_channel(pattern, action) {
    pattern = Irrigation.convert_path_to_array(pattern);
    var priority = this.calculate_priority(pattern);
    var i, channel, result = {
      pattern: pattern,
      action: action,
      priority: priority
    };

    // Find the right slot based on priority.
    // This is faster than resorting the array
    // every time a channel is added.
    for (i = 0; i < this.channels.length; ++i) {
      channel = this.channels[i];
      if (channel.priority < priority)
        break;
    }
    this.channels.splice(i, 0, result);

    return result;
  }

  apply_pattern(pattern, path) {
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
  }

  calculate_priority(path) {
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
  }

  compare(primary, secondary) {
    var a = Irrigation.convert_path_to_array(primary);
    var b = Irrigation.convert_path_to_array(secondary);
    var result = [];

    // Optional parameters can only be in the primary path,
    // so the secondary path can be possibly shorter but
    // never longer than the primary path.
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
        }
        else
          return false;
      }

      by = b[y];
      ax_pure = ax.replace(/\?$/, '');

      if (ax_pure == by
        || ax == '*'
        || (ax[0] == '%' && this.compare_parts(ax_pure, by))) {
        result.push(ax_pure);
        continue;
      }

      // Handle optional parameters
      if (ax[ax.length - 1] == '?') {
        --y;
        continue;
      }

      return false;
    }

    return result;
  }

  compare_parts(name, value) {
    var type = this.parameters[name.substring(1)];
    if (this.convert_value(value, type) === null)
      return false;
    else
      return true;
  }

  convert_value(value, type) {
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
  }

  determine_action(request) {
//      if (request.trellis && this.vineyard.trellises[request.trellis]) {
////            if (request.action == 'create') {
////                return 'create';
////            }
//        if (request.action) {
//          return request.action;
//        }
//        else if (request.id) {
//          return 'view';
//        }
//        else {
//          return 'index';
//        }
//      }

    if (request.action)
      return request.action;

    return 'other';
  }

  find_channel(path) {
    for (var i = 0; i < this.channels.length; i++) {
      var channel = this.channels[i];
      if (this.compare(channel.pattern, path)) {
        return channel;
      }
    }

    return null;
  }

  // Eventually parameters will be passed to this, but right now it's very simple.
  get_channel(type) {
    if (type == 'seed')
      return 'vineyard';
    if (type == 'page')
      return this.page_path;
    throw new Error(type + ' is not a valid channel type.');
  }

  get_destination(request) {
    var id = request.parameters.id || request.id;
    if (request.trellis) {
      if (request.action == 'create') {
        return 'create';
      }
      else if (id) {
        return 'view';
      }
      else {
        return 'index';
      }
    }
    else {
      'other';
    }

    return null
  }

  get_plant_url() {
    var channel = this.get_channel('seed');
    return Bloom.join(this.app_path, channel, 'update');
  }

  get_plot(trellis) {
    if (this.trellis_plots[trellis])
      return this.trellis_plots[trellis];

    return null;
  }

  url(trellis_or_seed, id, action, args) {
    var trellis;

    if (!trellis_or_seed)
      throw new Error('Invalid first argument');

    if (typeof trellis_or_seed == 'string') {
      trellis = trellis_or_seed;
    }
    else {
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
  }

  get_request() {
    return this.get_request_from_string(window.location.pathname);
  }

  get_request_from_string(path_string, ignore_browser_args = false) {
    var args, path;
    var query_index = path_string.indexOf('?');
    if (ignore_browser_args)
      args = '';

    if (query_index > -1) {
      args = path_string.substring(query_index);
      path_string = path_string.substring(0, query_index);
    }

    path = Irrigation.get_path_array(path_string, Bloom.join(this.app_path, this.page_path));

    var request:IRequest = {
      parameters: Bloom.get_url_properties(args),
      path: path
//            trellis: path[0]
    };

    var channel = this.find_channel(path);
    if (channel) {
      MetaHub.extend(request, this.apply_pattern(channel.pattern, path));

      if (typeof channel.action === 'function')
        MetaHub.extend(request, channel.action(path));
    }
    else {
      if (path.length > 1) {
        if (path.length > 2) {
          request.id = path[1];
          request.action = path[2];
        }
        else {
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
  }

  get_trellis(name) {
    throw new Error('not implemented.')
//      if (this.vineyard.trellises[name])
//        return name;
////            return this.vineyard.trellises[name];
//      return null;
  }


  static convert_path_to_array(path) {
    if (typeof path == 'object')
      return path;

    if (!path || path.length == 0)
      return [];
    if (path[0] == '/')
      path = path.substring(1);
    if (path[path.length - 1] == '/')
      path = path.substring(0, path.length - 1);
    return path.split('/');
  }

  static get_path_array(path, base) {
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
  }
}