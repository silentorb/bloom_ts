MetaHub.import_all(); 
Bloom.import_all();
Vineyard.import_all();

var Content_Panel = Flower.sub_class('Content_Panel', {
  load_index: function(name) {
    var self = this;
    this.element.empty();
    var seed = Seed_List.create(self.garden.vineyard.trellises[name]);
    seed.query = function() {
      return self.garden.initialize_query('vineyard/' + name);
    };
    var list = Index_List.create(seed);
    this.append(list);
    seed.update();
    var query = self.garden.initialize_query('?action=create&trellis=' + name);
    var create = $('<div class="create"><a href="'+ query + '">Create</a></div>');
    this.element.prepend(create);
  },
  load_create: function(trellis) {
    this.element.empty();

    var item = trellis.create_seed({});
    var request = Bloom.get_url_properties();
    for (var x in trellis.properties) {
      if (trellis.properties[x] !== undefined && request[x] != undefined) {
        if (trellis.properties[x].trellis)
          item[x] = {
            id: request[x]
          };
        else
          item[x] = request[x];
      }
    }

    var edit = Edit_Flower.create({
      seed: item,
      trellis: item.trellis
    });
    this.append(edit);
  //    edit.update();
  },
  load_edit: function(item) {
    this.element.empty();
    if (!item.trellis)
      throw new Error('item.trellis = null!');
    
    var edit = Edit_Flower.create({
      seed: item,
      trellis: item.trellis
    });
    this.append(edit);
  //    edit.update();
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
      handfulls: [ 'blocks' ],
      fertilizer: Block.load_library
    }
  },
  attach_model: function(model) {
    this.vineyard = Vineyard.create(model.trellises, model.views);
    this.vineyard.garden = this;
  },
  initialize_irrigation: function() {
    var irrigation = Irrigation.create();
    this.irrigation = irrigation
    irrigation.page_path = this.page_path;
    irrigation.app_path = this.app_path;
  },
  grow: function(next_action) {
    var self = this;

    Bloom.output = this.print;
    this.initialize_irrigation();
    this.request = this.irrigation.get_request();
    
    this.load_model('vineyard/model.json', function() {
      self.invoke('initialize');
      
      if (typeof next_action == 'function')
        next_action.apply(self);
      
      self.process_request(self.request);
    }); 
  },
  initialize_query: function(query) {
    return query;
  },
  goto_item: function(trellis_name, id) {
    var self = this;
    if (typeof trellis_name == 'object')
      trellis_name = trellis_name.name;
    var query = this.initialize_query(Bloom.join('vineyard', trellis_name, id));
    Bloom.get(query, function(response) {
      var item = self.vineyard.trellises[trellis_name].create_seed(response.objects[0]);
      self.content_panel.load_edit(item);
      self.invoke('edit', item);

    });
  },
  load_model: function(url, success) {
    var self = this;
    Bloom.get(url, function(model) {
      self.attach_model(model);
      if (typeof success == 'function')
        success(model);
    }, function(err) {
      console.log(url, err.responseText);
    }, typeof success === 'undefined');
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
    var id = request.parameters.id || request.id;
    if (request.trellis) {
      if (request.action == 'create') {
        this.invoke('create', this.vineyard.trellises[request.trellis]);
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

Garden.grow = function(name, properties) {
  var Sub_Garden = Garden.subclass(name, properties);
  var garden = Sub_Garden.create();
  jQuery(function () {
    var landscape_element = $('#garden-landscape');
    if (landscape_element.length) {
      var settings = JSON.parse(landscape_element.text());
      MetaHub.extend(garden, settings);
    }

    if (garden.app_path)
      Bloom.ajax_prefix = garden.app_path;
    
    if (garden.block_path)
      Block.source_path = garden.block_path;
      
    if (typeof garden.initialize_core == 'function')
      garden.initialize_core();

    Bloom.Ground.fertilize(garden.dirt, function() {
      Garden.methods.grow.call(garden, garden.grow);
    });
  });
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

var Edit_Flower = Vineyard.Arbor.sub_class('Edit_Flower', {
  block: 'edit-form',
  initialize: function() {
    var self = this;
    this.element.find('input[type=submit], button[type=submit]').click(function(e) {
      self.seed.plant();
    });
  }
});
  
var Irrigation = Meta_Object.subclass('Irrigation', {
  app_path: '',
  page_path: '',
  // Eventually parameters will be passed to this, but right now it's very simple.
  get_channel: function(type) {
    if (type == 'seed')
      return 'vineyard';
    
    if (type == 'page')
      return this.page_path;
    
    throw new Error (type + ' is not a valid channel type.');
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
  get_request: function() {
    var path = Irrigation.get_path_array(window.location.pathname, this.app_path);
    var request = {
      'parameters': Bloom.get_url_properties(),
      path: path,
      trellis: path[1]
    };
    
    if (path.length > 2) {
      if (path.length > 3) {
        request.id = path[2];
        request.action = path[3];
      }
      else {
        if (path[2].match(/\d+/))
          request.id = path[2];
        else
          request.action = path[2];
      }
    }
    
    return request;
  }
});

Irrigation.get_path_array = function(path, base) {
  if (path[0] == '/')
    path = path.substring(1);
  
  path = path.split('/');
  if (typeof base === 'string' && base.length > 0) {
    if (base[0] == '/')
      base = base.substring(1);
    
    if (base.length == 0)
      return path;
    
    var base_path = base.split('/');
    path.splice(0, base_path.length);
  }
  
  return path;
}