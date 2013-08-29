MetaHub.import_all();
Bloom.import_all();
Vineyard.import_all();

var Edit_Arbor = Vineyard.Natural_Arbor.sub_class('Edit_Arbor', {
  block: 'edit-form',
  initialize: function (garden) {
    this.garden = garden;
    var self = this;
    this.element.find('input[type=submit], button[type=submit], #submit').click(function (e) {
      e.preventDefault();
      Seed.plant(self.seed, self.trellis, false, function (seed, response) {
        var key = self.trellis.primary_key;
        self.seed[key] = response.objects[0][key];
        self.goto_destination(self.seed);
      });
    });
    this.element.find('#cancel, .cancel').click(function (e) {
      self.garden.vineyard.trellises.todo.disconnect_all('seed');
      e.preventDefault();
      history.back();
    });
    this.element.find('#delete, .delete').click(function (e) {
      e.preventDefault();
      if (window.Confirmation_Dialog) {
        var dialog = Confirmation_Dialog.create({
          question: 'Are you sure you want to delete ' + self.seed.name + '?'
        });
        dialog.options.title = 'Delete ' + Vine.pretty_name(self.seed.trellis.name);
        self.listen(dialog, 'yes', function () {
          self.seed._delete(false, function () {
            self.garden.lightning(self.parent_url());
          });
        });
        dialog.show();
      }
      else {
        self.seed._delete();
      }
    });
  },
  destination: function (seed) {
    return this.garden.irrigation.url(seed);
  },
  goto_destination: function (seed) {
    var destination = this.destination(seed);
    if (this.garden && destination) {
      this.garden.lightning(destination);
    }
  },
  parent_url: function () {
    return Bloom.join(this.garden.app_path, this.trellis.name);
  }
});

var Not_Found_Arbor = Arbor.subclass('Not_Found_Arbor', {
  block: 'not-found'
});

// The primary content area of the page.  A placeholder for arbors.
// It's sort of like Arbors are the pages and Plot is the viewport.
// However, the complicated nature of webpages means that sometimes
// Different plots are required for different arbors.
var Plot = Flower.sub_class('Plot', {
  arbors: {},
  default_arbor: Edit_Arbor,
  initialize: function () {
    if (!this.element || this.element.length == 0)
      this.element = $('<div />');
  },
  get_arbor: function (trellis, action, child) {
    var name;
    action = action || 'view';

    if (!child)
      name = trellis.name + '.' + action;
    else
      name = trellis.name + '.' + child + '.' + action;

    console.log('Arbor pattern: ' + name);
    if (this.arbors[name])
      return this.arbors[name];
    name = '*.' + trellis.name
    if (this.arbors[name])
      return this.arbors[name];
    // 'create' defaults to 'edit'.
    if (action == 'create') {
      return this.get_arbor(trellis, 'edit');
    }

    if (this.arbors[trellis.name])
      return this.arbors[trellis.name];

    if (trellis.parent) {
      return this.get_arbor(trellis.parent, action);
    }
    return null;
  },
  get_content: function () {
    if (this.content)
      return this.content;
    else
      return this.element;
  },
  get_trellis: function (seed, request) {
    if (seed && seed.trellis)
      return seed.trellis;

    return this.garden.vineyard.trellises[request.trellis];
  },
  index: function (request) {
    var self = this;
    var trellis = this.garden.vineyard.trellises[request.trellis];
    var arbor_type = this.get_arbor(trellis, 'index');
    if (arbor_type) {
//      var query = '';
//      if (typeof(arbor_type.query) === 'function')
//        query = arbor_type.query(request);

//      this.garden.load_seeds(request.trellis, query, function (objects) {
      self.place_arbor(arbor_type, null, request);
//      });
    }
  },
  place_arbor: function (arbor_type, seed, request) {
    var view, trellis = this.get_trellis(seed, request);
    this.invoke('load.edit', seed, request, arbor_type);
    if (request.action && trellis) {
      view = this.garden.vineyard.views[request.action + '.' + trellis.name];
    }
    var arbor = arbor_type.create(seed, trellis, view);
    arbor.garden = this.garden;
    if (arbor.grow)
      arbor.grow();

    if (this.arbor) {
      this.refresh(this.arbor.seed, seed, arbor.element);
    }
    else {
      // This is the same as refresh because refresh is designed to
      // be overwritten, and this block will work the same if it is.
      var content = this.get_content();
      this.set_header(seed);
      content.empty();
      content.append(arbor.element);
    }

    this.arbor = arbor;
  },
  place_arbor_from_request: function (seed, request) {
    var trellis = this.get_trellis(seed, request);
    var arbor_type = this.get_arbor(trellis, request.action);
    arbor_type = arbor_type || this.default_arbor;
    this.place_arbor(arbor_type, seed, request);
  },
  refresh: function (old_seed, seed, element) {
    var content = this.get_content();
    this.set_header(seed);
    content.empty();
    content.append(element);
  },
  replace_element: function (new_element) {
    var content = this.get_content();
    content.empty();
    this.append(new_element);
  },
  set_garden: function (garden) {
    this.garden = garden;
    this.listen(garden, 'index', this.index);
    //    this.listen(garden, 'create', this.load_create);
    //    this.listen(garden, 'edit', this.place_arbor_from_request);
  },
  set_header: function (seed) {
  }
});

// Garden - The central web app.  Intended to be subclassed once per project
// Mainly it ties together Vineyard, Irrigation, and Mulch.
// garden.grow() is the primary method for defining a Garden,
// because it is called after the sub-systems such as Mulch
// are loaded.

/* Recommended method to start an app:

 $(function() {
 Garden.app = Garden.create();
 Garden.app.start();
 });

 */
var Garden = Meta_Object.subclass('Garden', {
  plot_container: '',
  dirt: {
    blocks: {
      handfulls: ['blocks'],
      fertilizer: Block.load_library
    }
  },
  distinct_arbor_pages: false, // Changing arbors requires full page load.
  initialize: function () {
    if (this.block_path)
      Block.source_path = this.block_path;

    Bloom.output = this.print;
  },
  initialize_irrigation: function () {
    var irrigation = Irrigation.create(this.vineyard);
    this.irrigation = irrigation
    irrigation.page_path = this.page_path;
    irrigation.app_path = this.app_path;
    this.initialize_history_change();
  },
  initialize_history_change: function () {
    var self = this;
    window.onpopstate = function (state) {
      if (!state)
        return;
      if (state.direction == 'forward')
        Plot.direction = 'back';
      if (state.direction == 'back')
        Plot.direction = 'forward';
      self.request = self.irrigation.get_request();
      self.invoke('history.change', self.request);
      self.process_request(self.request);
    }

  },
  attach_model: function (model) {
    model = model || {
      trellises: {},
      views: {}
    }
    this.vineyard = Vineyard.create(model.trellises, model.views);
    this.vineyard.garden = this;
  },
  clear_content: function () {

  },
  create_plot: function (type) {
    if (this.plot && type.name === this.plot.meta_source.name)
      return this.plot;

    var plot = type.create(this);
    if (typeof plot.set_garden === 'function')
      plot.set_garden(this);

    var plot_container = $(this.plot_container);
    if (plot_container.length == 0)
      throw new Error("Could not find plot container: '" + this.plot_container + "'");

    this.invoke('create-plot', plot, this.plot, plot_container);
    plot_container.empty();
    plot_container.append(plot.element);
    this.plot = plot;
    return plot;
  },
  get_plot: function (request) {
    var plot_type = this.get_plot_type(request);
    if (!plot_type)
      return null;
    //      throw new Error('No matching plot could be found.');

    return this.create_plot(plot_type);
  },
  get_plot_type: function (request) {
    return this.irrigation.get_plot(request.trellis);
  },
  goto_request_object: function (request) {
    var self = this;
    this.load_seed(request.trellis, request.id, request.parameters, function (seed) {
      if (!seed) {
        self.not_found();
        return;
      }

      self.show_arbor(seed, request);
    });
  },
  goto_item: function (target, args) {
    var trellis_name, id = null, arg_string, self = this;
    args = args || {};

    // All sorts of args are passed around, and some types
    // are not used here.  Any collection of args that contains
    // objects can be quickly identified as a collection to ignore.
    for (var i in args) {
      if (typeof args[i] == 'object') {
        args = {};
        break;
      }
    }
    if (typeof target == 'object') {
      // Is target a seed?
      if (typeof target.trellis == 'object') {
        trellis_name = target.trellis.name;
        id = target[target.trellis.primary_key];
        if (id === undefined)
          return;
      }
      // Is target a trellis?
      else if (target.meta_source === Trellis) {
        trellis_name = target.name;
      }
      // Target must be a request (or invalid, which is hard to fully detect.)
      else {
        var request = target;
        trellis_name = target.trellis;
        if (request.parameters) {
          id = request.id || request.parameters.id;
          args = request.parameters;
        }
        else {
          id = request.id;
        }
      }
    }
    this.load_seed(trellis_name, id, args, function (seed) {
      if (!seed)
        return;

      self.request.trellis = trellis_name;
      self.show_arbor(seed, self.request);
    });
  },
  grow: function () {
    // Intended to be overridden by subclass.
  },
  lightning: function (url, multiple, silent) {
    var args = Array.prototype.slice.call(arguments);
    silent = args[args.length - 1];
    if (typeof url === 'object') {
      if (Object.prototype.toString.call(url) === '[object Array]') {
        url = Bloom.join(this.app_path, url.join('/'));
      }
      else {
        url = this.irrigation.url.apply(this.irrigation, args);
      }
    }
    this.request = this.irrigation.get_request_from_string(url);
    var plot_type = this.get_plot_type(this.request);
    if (plot_type && this.plot && this.plot.meta_source.name != plot_type.name && this.distinct_arbor_pages) {
      window.location = url;
      return;
    }
    if (silent !== true) {
      history.pushState({
        name: 'garden',
        direction: Plot.direction
      }, '', url);

//      this.request = this.irrigation.get_request();
    }
//    else {
//    }

    this.clear_content();
    this.process_request(this.request);
  },
  // Loads data embedded in the web page
  load_landscape: function () {
    var landscape_element = $('#garden-landscape');
    if (landscape_element.length) {
      var settings = JSON.parse(landscape_element.text());
      MetaHub.extend(this, settings);
    }
  },
  load_resources: function (callback) {
    var self = this;
    this.dirt.model = {
      handfulls: ['model'],
      fertilizer: function (model) {
        self.attach_model(JSON.parse(model));
      },
      url: Bloom.join(this.app_path, 'vineyard/model.json')
    };
    Bloom.Mulch.load_resources(this.dirt, callback, this.app_path);
  },
  load_seed: function (trellis, id, args, done) {
    if (!trellis)
      throw new Error('Missing trellis in call to load_seed!');

    var self = this;
    if (typeof args == 'function') {
      done = args;
      args = null;
    }
    done = done || function () {
    };

    var query = Bloom.join(this.app_path, 'vineyard', trellis, id, Bloom.render_query(args));
    Bloom.get(query, function (response) {
      if (!response.objects.length) {
//                console.log('No objects found with query: ' + query);
        self.invoke('not-found', trellis, args);
        done(null);
        return;
      }

      var source = response.objects[0];

      // Wrap trellis in an object so it's hooks can change it.
      var data = {
        source: source,
        trellis: trellis
      }
      self.invoke('load.seed.' + trellis, data);
      var seed = self.vineyard.trellises[data.trellis].create_seed(data.source);
      done(seed);
    });
  },
  load_seeds: function (trellis_name, args, done) {
    var self = this;
    if (typeof args == 'function') {
      done = args;
      args = null;
    }
    done = done || function () {
    };
    var query = Bloom.join(this.app_path, 'vineyard', trellis_name, Bloom.render_query(args));
    Bloom.get(query, function (response) {
      var objects = response.objects;
      var trellis = self.vineyard.trellises[trellis_name];
      for (var i = 0; i < objects.length; ++i) {
        objects[i] = trellis.create_seed(objects[i]);
      }
      done(objects);
    });
  },
  not_found: function() {
    var plot = this.get_plot(this.request);
    if (plot) {
    plot.place_arbor(Not_Found_Arbor, null, this.request);
    }
  },
  on_create: function (request) {
    var self = this;
    this.invoke_async('create.' + request.trellis, request, function (request) {
      var item = self.vineyard.trellises[request.trellis].create_seed(request.parameters);
      self.plot.place_arbor_from_request(item, request);
      self.invoke('edit', item, request);
    });
  },
  print: function (response) {
    if (!response.message)
      return;
    var container = $('.messages');
    if (!container.length) {
      container = $('<div class="messages status"/>');
      $('.breadcrumb').after(container);
    }
    else {
      container.empty();
    }

    container.append($('<div>' + response.message + '</div>'));
  },
  process_request: function (request) {
//        console.log(request);
    //    if (request.trellis && this.vineyard.trellises[request.trellis]) {
    this.get_plot(request);

    var action = this.irrigation.determine_action(request, this.vineyard);
    if (typeof action == 'function') {
      action(request);
    }
    else if (typeof action == 'string') {
      this.invoke(action, request);

      if (action == 'create') {
        this.on_create(request);
      }
      else if (action == 'edit' || action == 'goto') {
        this.goto_request_object(request)
      }
      else if (request.id) {
        this.goto_request_object( request)
      }
    }
    else {
      throw new Error("Invalid action type.");
    }
  },
  start: function (callback) {
    var self = this;

    // First load the app data
    this.load_landscape();
    this.invoke('landscape');
    this.load_resources(function () {

      // Then finish initializing
      self.initialize_irrigation();
      self.grow();

      // Then process the request (based on the browser url).
      self.request = self.irrigation.get_request();
      self.process_request(self.request);

      // Then let the world know you're ready.
      if (typeof callback == 'function')
        callback();

      self.invoke('live');
    });
  },
  show_arbor: function (seed, request, arbor) {
    var plot = this.get_plot(request);
    if (plot) {
      if (arbor) {
        plot.place_arbor(arbor, seed, request);
      }
      else {
        plot.place_arbor_from_request(seed, request);
      }
    }
  }
});
Garden.grow = function (testing, garden) {
  if (!garden)
    garden = this.create();

  jQuery(function () {
    garden.load_landscape();
    garden.load_resources();
  });
  return garden;
}

var Index_Item = Flower.sub_class('Index_Item', {
  initialize: function () {
    this.element = $('<div><a href="">' + this.seed.name + '</a></div>');
    this.element.find('a').attr('href', this.seed.get_url('page'));
  }
});

var Child_Item = Index_Item.sub_class('Child_Item', {
  initialize: function () {
    var self = this;
    this.element.append('<a class="delete" href="">X</a>');
    this.element.find('a.delete').click(function (e) {
      e.preventDefault();
      self.seed.disconnect_all();
      self.disconnect_all();
    });
  }
});

var Index_List = List.sub_class('Index_List', {
  item_type: Index_Item
});

var Children_List = List.sub_class('Children_List', {
  block: 'list',
  item_type: Child_Item
});

List_Vine.properties.list_type = Children_List;

var Irrigation = Meta_Object.subclass('Irrigation', {
  app_path: '',
  page_path: '',
  trellis_plots: {},
  channels: [],
  parameters: {
    trellis: 'trellis',
    id: 'int',
    action: 'string'
  },
  vineyard: null,
  initialize: function (vineyard) {
    this.vineyard = vineyard;
    this.add_channel(['%trellis', '%id', '%action?']);
    this.add_channel(['%trellis', '%action?']);
  },
  add_channel: function (pattern, action) {
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
  },
  apply_pattern: function (pattern, path) {
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
  },
  calculate_priority: function (path) {
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
  },
  compare: function (primary, secondary) {
    a = Irrigation.convert_path_to_array(primary);
    b = Irrigation.convert_path_to_array(secondary);
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
  },
  compare_parts: function (name, value) {
    var type = this.parameters[name.substring(1)];
    if (this.convert_value(value, type) === null)
      return false;
    else
      return true;
  },
  convert_value: function (value, type) {
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
  },
  determine_action: function (request) {
    if (request.trellis && this.vineyard.trellises[request.trellis]) {
//            if (request.action == 'create') {
//                return 'create';
//            }
      if (request.action) {
        return request.action;
      }
      else if (request.id) {
        return 'view';
      }
      else {
        return 'index';
      }
    }

//        for (var path in this.late_channels) {
//            if (this.compare(path, request.path)) {
//                return this.late_channels[path];
//            }
//        }

    if (request.action)
      return request.action;

    return 'other';
  },
  find_channel: function (path) {
    for (var i = 0; i < this.channels.length; i++) {
      var channel = this.channels[i];
      if (this.compare(channel.pattern, path)) {
        return channel;
      }
    }

    return null;
  },
  // Eventually parameters will be passed to this, but right now it's very simple.
  get_channel: function (type) {
    if (type == 'seed')
      return 'vineyard';
    if (type == 'page')
      return this.page_path;
    throw new Error(type + ' is not a valid channel type.');
  },
  get_destination: function (request) {
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
  },
  get_plant_url: function () {
    var channel = this.get_channel('seed');
    return Bloom.join(this.app_path, channel, 'update');
  },
  get_plot: function (trellis) {
    if (this.trellis_plots[trellis])
      return this.trellis_plots[trellis];

    return null;
  },
  url: function (trellis_or_seed, id, action, args) {
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
  },
  get_request: function () {
    return this.get_request_from_string(window.location.pathname);
  },
  get_request_from_string: function (path_string) {
    var args, path;
    var query_index = path_string.indexOf('?');
    if (query_index > -1) {
      args = path_string.substring(query_index);
      path_string = path_string.substring(0, query_index);
    }

    path = Irrigation.get_path_array(path_string, Bloom.join(this.app_path, this.page_path));

    var request = {
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
  },
  get_trellis: function (name) {
    if (this.vineyard.trellises[name])
      return name;
//            return this.vineyard.trellises[name];
    return null;
  }
});

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
}

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
}
