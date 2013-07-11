MetaHub.import_all();
Bloom.import_all();
Vineyard.import_all();

var Edit_Arbor = Vineyard.Arbor.sub_class('Edit_Arbor', {
  block: 'edit-form',
  initialize: function (garden) {
    this.garden = garden;
    var self = this;
    this.element.find('input[type=submit], button[type=submit], #submit').click(function (e) {
      e.preventDefault();
      self.seed.plant();
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
          self.seed._delete();
        });
        dialog.show();
      }
      else {
        self.seed._delete();
      }
    });
  }
});

// The primary content area of the page.  A placeholder for arbors.
// It's sort of like Arbors are the pages and Plot is the viewport.
// However, the complicated nature of webpages means that sometimes
// Different plots are required for different arbors.
var Plot = Flower.sub_class('Plot', {
  arbors: {},
  default_arbor: Edit_Arbor,
  initialize: function () {
    this.element = $('<div />');
  },
  get_arbor: function (trellis, action) {
    var name;
    if (action) {
      name = action + '.' + trellis.name;
      if (this.arbors[name])
        return this.arbors[name];
      name = '*.' + trellis.name
      if (this.arbors[name])
        return this.arbors[name];
      // 'create' defaults to 'edit'.
      if (action == 'create') {
        return this.get_arbor(trellis, 'edit');
      }
    }

    if (this.arbors[trellis.name])
      return this.arbors[trellis.name];
    return this.default_arbor;
  },
  get_trellis: function (seed, request) {
    if (seed.trellis)
      return seed.trellis;

    return this.garden.vineyard.trellises[request.trellis];
  },
  index: function (request) {
    var name = request.trellis;
    var self = this;
    this.element.empty();
    var seed = Seed_List.create(self.garden.vineyard.trellises[name]);
    seed.query = function () {
      return Bloom.join(self.garden.app_path, 'vineyard', name);
    };
    var list = Index_List.create(seed);
    this.append(list);
    seed.update();
    var query = '?action=create&trellis=' + name;
    var create = $('<div class="create"><a href="' + query + '">Create</a></div>');
    this.content.prepend(create);
  },
  load_edit: function (seed, request) {
    var trellis = this.get_trellis(seed, request);
    var view, arbor = this.get_arbor(trellis, request.action);
    this.invoke('load.edit', seed, request, arbor);
    if (request.action) {
      view = this.garden.vineyard.views[request.action + '.' + trellis.name];
    }
    var edit = arbor.create(seed, trellis, view);
    edit.garden = this.garden;
    if (this.arbor) {
      this.refresh(this.arbor.seed, seed, edit.element);
    }
    else {
      this.set_header(seed);
      this.element.empty();
      this.element.append(edit.element);
    }

    this.arbor = edit;
  },
  refresh: function(old_seed, seed, element) {
    this.set_header(seed);
    this.element.empty();
    this.element.append(element);
  },
  replace_element: function (new_element) {
    this.element.empty();
    this.append(new_element);
  },
  set_garden: function (garden) {
    this.garden = garden;
    this.listen(garden, 'index', this.index);
    //    this.listen(garden, 'create', this.load_create);
    //    this.listen(garden, 'edit', this.load_edit);
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
  initialize: function () {
    if (this.block_path)
      Block.source_path = this.block_path;

    this.listen(this, 'create', this.on_create);
    this.listen(this, 'goto', this.goto_item);
    this.listen(this, 'edit', this.goto_item);
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
  goto_item: function (trellis_name, args) {
    var id = null, arg_string, self = this;
    if (typeof trellis_name == 'object') {
      var request = trellis_name;
      trellis_name = trellis_name.trellis || trellis_name.name;
      args = args || {};
      if (request.parameters)
        args = MetaHub.extend(args, request.parameters);
      id = request.id;
    }

//        // Ensure arguments are in string form.
//        if (typeof args == 'object') {
//            arg_string = Bloom.render_query(args);
//            self.request.args = args;
//        }
//        else {
//            arg_string = args;
//        }

    this.load_seed(trellis_name, id, args, function (seed) {
      if (!seed)
        return;

      self.request.trellis = trellis_name;
      var plot = self.get_plot(self.request);
      if (plot) {
        plot.load_edit(seed, self.request);
//                self.invoke('edit', seed);
      }
    });
  },
  grow: function () {
    // Intended to be overridden by subclass.
  },
  lightning: function (url, multiple, silent) {
    var args = Array.prototype.slice.call(arguments);
    if (typeof url === 'object') {
      url = this.irrigation.url.apply(this.irrigation, args);
    }
    if (args[args.length - 1] !== true) {
      history.pushState({
        name: 'garden',
        direction: Plot.direction
      }, '', url);

      this.request = this.irrigation.get_request();
    }
    else {
      this.request = this.irrigation.get_request_from_string(url);
    }

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

      var seed = self.vineyard.trellises[trellis].create_seed(response.objects[0]);
      done(seed);
    });
  },
  load_seeds: function (trellis, args, done) {
    var self = this;
    if (typeof args == 'function') {
      done = args;
      args = null;
    }
    done = done || function () {
    };
    var query = Bloom.join(this.app_path, 'vineyard', trellis, Bloom.render_query(args));
    Bloom.get(query, function (response) {
      done(response.objects);
    });
  },
  on_create: function (request) {
    var self = this;
    this.invoke_async('create.' + request.trellis, request, function (request) {
      var item = self.vineyard.trellises[request.trellis].create_seed(request.parameters);
      self.plot.load_edit(item, request);
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
    this.add_channel(['%trellis', '%id', '%action']);
    this.add_channel(['%trellis', '%id']);
    this.add_channel(['%trellis', '%action']);
    this.add_channel(['%trellis']);
  },
  add_channel: function (pattern, action) {
    var result = {
      pattern: Irrigation.convert_path_to_array(pattern),
      action: action
    };
    this.channels.push(result);
    return result;
  },
  apply_pattern: function (path, channel) {
    if (typeof path !== 'object')
      throw new Error('path must be an array');

    if (typeof channel !== 'object')
      throw new Error('channel must be an array');

    if (path.length !== channel.length)
      throw new Error('Irrigation.apply_pattern() requires a path and channel with the same length. (path.length = ' +
        path.length + '. channel.length = ' + channel.length + '.)');

    var result = {};
    for (var i = 0; i < path.length; ++i) {
      var part = channel[i];
      if (part[0] == '%') {
        var type = part.substring(1);
        result[type] = this.convert_value(path[i], type);
      }
    }

    return result;
  },
  compare: function (a, b) {
    a = Irrigation.convert_path_to_array(a);
    b = Irrigation.convert_path_to_array(b);

    if (a.length != b.length)
      return false;

    for (var i = 0; i < a.length; i++) {
      if (a[i] == '*' || b[i] == '*')
        continue;

      if (a[i][0] == '%' && this.compare_parts(a[i], b[i]))
        continue;

      if (b[i][0] == '%' && this.compare_parts(b[i], a[i]))
        continue;

      if (a[i] != b[i])
        return false;
    }

    return true;
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
        return 'goto';
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

    return 'other';
  },
  find_channel: function (path) {
    for (var i = 0; i < this.channels.length; i++) {
      var channel = this.channels[i];
      if (this.compare(path, channel.pattern)) {
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
      if (!seed.trellis)
        throw new Error('Invalid seed.');

      trellis = seed.trellis.name;
      args = action;
      action = id;
      id = seed[seed.trellis.primary_key];
    }

//        var channel = this.get_channel(type);
//        var trellis = this.get_trellis(trellis);
    return Bloom.join(this.app_path, trellis, id, action) + Bloom.render_query(args);
  },
  get_request: function () {
    return this.get_request_from_string(window.location.pathname);
  },
  get_request_from_string: function (path_string) {
    var path = Irrigation.get_path_array(path_string, Bloom.join(this.app_path, this.page_path));
    var request = {
      parameters: Bloom.get_url_properties(),
      path: path
//            trellis: path[0]
    };

    var channel = this.find_channel(path);
    if (channel) {
      MetaHub.extend(request, this.apply_pattern(path, channel.pattern));

      if (typeof channel.action === 'function')
        MetaHub.extend(request, channel.action(path));
    }

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
