MetaHub.import_all();
Bloom.import_all();
Vineyard.import_all();

var Edit_Arbor = Vineyard.Arbor.sub_class('Edit_Arbor', {
  block: 'edit-form',
  initialize: function() {
    var self = this;
    this.element.find('input[type=submit], button[type=submit], #submit').click(function(e) {
      self.seed.plant();
    });
  }
});

var Content_Panel = Flower.sub_class('Content_Panel', {
  arbors: {},
  default_arbor: Edit_Arbor,
  initialize: function() {
    this.content = this.element;
  },
  load_index: function(name) {
    var self = this;
    this.content.empty();
    var seed = Seed_List.create(self.garden.vineyard.trellises[name]);
    seed.query = function() {
      return Bloom.join(self.garden.app_path, 'vineyard', name);
    };
    var list = Index_List.create(seed);
    this.append(list);
    seed.update();
    var query = self.garden.initialize_query('?action=create&trellis=' + name);
    var create = $('<div class="create"><a href="' + query + '">Create</a></div>');
    this.content.prepend(create);
  },
  get_arbor: function(trellis, action) {
    var name;
    if (action) {
      name = action + '.' + trellis.name;
      if (this.arbors[name])
        return this.arbors[name];
      
      name = '*.' + trellis.name
      if (this.arbors[name])
        return this.arbors[name];
    }
    else if (this.arbors[trellis.name])
      return this.arbors[trellis.name];

    return this.default_arbor;
  },
  load_create: function(trellis, request) {
    var item = trellis.create_seed({});
    //    var request = Bloom.get_url_properties();
    //    for (var x in trellis.properties) {
    //      if (trellis.properties[x] !== undefined && request[x] != undefined) {
    //        if (trellis.properties[x].trellis)
    //          item[x] = {
    //            id: request[x]
    //          };
    //        else
    //          item[x] = request[x];
    //      }
    //    }

    var arbor = this.get_arbor(item.trellis, request.action);
    var edit = arbor.create({
      seed: item,
      trellis: item.trellis
    });

    this.replace_element(edit);
  },
  load_edit: function(item) {
    if (!item.trellis)
      throw new Error('item.trellis = null!');

    if (this.arbor && typeof this.arbor.refresh == 'function') {
      this.arbor.refresh(item);
    }
    else {
      var arbor = this.get_arbor(item.trellis);
      var edit = arbor.create({
        seed: item,
        trellis: item.trellis
      });
      this.arbor = edit;
      this.replace_element(edit);
    }
  },
  replace_element: function(new_element) {
    this.content.empty();
    this.append(new_element);
  },
  set_garden: function(garden) {
    this.garden = garden;
    this.listen(garden, 'index', this.load_index);
    this.listen(garden, 'create', this.load_create);
  //    this.listen(garden, 'edit', this.load_edit);
  }
});

var Garden = Meta_Object.subclass('Garden', {
  dirt: {
    blocks: {
      handfulls: ['blocks'],
      fertilizer: Block.load_library
    }
  },
  initialize: function() {
    if (this.block_path)
      Block.source_path = this.block_path;
  },
  attach_model: function(model) {
    this.vineyard = Vineyard.create(model.trellises, model.views);
    this.vineyard.garden = this;
  },
  clear_content: function() {

  },
  initialize_irrigation: function() {
    var irrigation = Irrigation.create();
    this.irrigation = irrigation
    irrigation.page_path = this.page_path;
    irrigation.app_path = this.app_path;
  },
  fertilize: function() {
    var self = this;
    this.dirt.model = {
      handfulls: ['model'],
      fertilizer: function(model) {
        self.attach_model(JSON.parse(model));
      },
      url: Bloom.join(this.app_path, 'vineyard/model.json')
    };
    Bloom.Mulch.fertilize(this.dirt, function() {
      Garden.methods.grow.call(self);
      if (self.grow !== Garden.methods.grow)
        self.grow();
      
      self.request = self.irrigation.get_request();
      self.process_request(self.request);
    }, this.app_path);
  },
  grow: function(next_action) {
    var self = this;

    Bloom.output = this.print;
    this.initialize_irrigation();
    this.request = this.irrigation.get_request();

    self.invoke('initialize');
  },
  initialize_query: function(query) {
    return query;
  },
  goto_item: function(trellis_name, id) {
    var self = this;
    if (typeof trellis_name == 'object')
      trellis_name = trellis_name.name;
    var query = Bloom.join(this.app_path, 'vineyard', trellis_name, id);
    Bloom.get(query, function(response) {
      var item = self.vineyard.trellises[trellis_name].create_seed(response.objects[0]);
      self.content_panel.load_edit(item, self.request);
      self.invoke('edit', item);
    });
  },
  lightning: function(trellis, action, args) {
    var url;
    
    if (arguments.length < 2) {
      url = trellis;
    }
    else {
      url = Bloom.join(this.app_path, trellis.name, action) + Bloom.render_query(args);
    }
    history.pushState({}, '', url);
    this.clear_content();
    this.request = this.irrigation.get_request();
    this.process_request(this.request);
  },
  load_landscape: function() {
    var landscape_element = $('#garden-landscape');
    if (landscape_element.length) {
      var settings = JSON.parse(landscape_element.text());
      MetaHub.extend(this, settings);
    }
  },
  print: function(response) {
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
  process_request: function(request) {
    console.log(request);
    var id = request.parameters.id || request.id;
    if (request.trellis && this.vineyard.trellises[request.trellis]) {
      if (request.action == 'create') {
        var item = this.vineyard.trellises[request.trellis].create_seed(request.parameters);
        this.content_panel.load_edit(item, request);
        this.invoke('edit', item, request);
      //this.invoke('create', this.vineyard.trellises[request.trellis], request);
      //          Garden.content_panel.load_create(Garden.vineyard.trellises[request.trellis]);
      }
      else if (id) {
        this.goto_item(request.trellis, id);
      }
      else {
        this.invoke('index', request.trellis);

      }
    }
    else {
      this.invoke('other');
    }
  }
});

Garden.grow = function(testing) {
  // When unit testing this function is skipped because it is very global.
  // The only way to run this function during unit testing is to pass it the value true.
  if (!testing && window.TESTING)
    return;

  var garden = this.create();
  jQuery(function() {
    garden.load_landscape();
    garden.fertilize();
  });

  return garden;
}

var Index_Item = Flower.sub_class('Index_Item', {
  initialize: function() {
    this.element = $('<div><a href="">' + this.seed.name + '</a></div>');
    this.element.find('a').attr('href', this.seed.get_url('page'));
  }
});

var Child_Item = Index_Item.sub_class('Child_Item', {
  initialize: function() {
    var self = this;
    this.element.append('<a class="delete" href="">X</a>');
    this.element.find('a.delete').click(function(e) {
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
  trellis_map: {},
  // Eventually parameters will be passed to this, but right now it's very simple.
  get_channel: function(type) {
    if (type == 'seed')
      return 'vineyard';

    if (type == 'page')
      return this.page_path;

    throw new Error(type + ' is not a valid channel type.');
  },
  get_destination: function(request) {
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
  get_plant_url: function() {
    var channel = this.get_channel('seed');
    return Bloom.join(this.app_path, channel, 'update');
  },
  get_url: function(type, trellis, id, action, args) {
    var channel = this.get_channel(type);
    var trellis = this.get_trellis(trellis);
    return Bloom.join(this.app_path, channel, trellis, id, action) + Bloom.render_query(args);
  },
  get_request: function() {
    return this.get_request_from_string(window.location.pathname);
  },
  get_request_from_string: function(path_string) {
    var path = Irrigation.get_path_array(path_string, Bloom.join(this.app_path, this.page_path));
    var request = {
      'parameters': Bloom.get_url_properties(),
      path: path,
      trellis: path[0]
    };

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

    return request;
  },
  get_trellis: function(name) {
    if (this.trellis_map[name] !== undefined)
      return this.trellis_map[name];

    return name;
  }
});

Irrigation.convert_path_to_array = function(path) {
  if (!path || path.length == 0)
    return [];
  
  if (path[0] == '/')
    path = path.substring(1);
    
  if (path[path.length - 1] == '/')
    path = path.substring(0, path.length - 1);
    
  return path.split('/');
}

Irrigation.get_path_array = function(path, base) {
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

//Irrigation.get_path_array = function(path, base, page_path) {
//  if (path[0] == '/')
//    path = path.substring(1);
//
//  path = path.split('/');
//  if (typeof base === 'string' && base.length > 0) {
//    if (base[0] == '/')
//      base = base.substring(1);
//
//    if (base.length == 0)
//      return path;
//
//    var base_path = base.split('/');
//    path.splice(0, base_path.length);
//  }
//
//  return path;
//}