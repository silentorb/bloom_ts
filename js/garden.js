MetaHub.import_all(); 
Bloom.import_all();
Vineyard.import_all();

var Content_Panel = Flower.sub_class('Content_Panel', {
  load_index: function(name) {
    var self = this;
    this.element.empty();
    var seed = Seed_List.create(self.garden.vineyard.trellises[name]);
    seed.query = function() {
      return self.garden.initialize_query('vineyard/get?trellis=' + name);
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
  blocks: {
    'blocks': [ 'blocks' ]
  },
  grow: function(next_action) {
    var self = this;
    this.request = {
      'parameters': Bloom.get_url_properties(),
      path: Garden.get_path_array(window.location.pathname, this.ajax_path)
    };
    
    this.request.trellis = this.request.path[1];
    this.request.action = this.request.path[2];
    Bloom.output = this.print;
    
    Bloom.get('vineyard/model.json', function(response) {
      self.vineyard = Vineyard.create(response.trellises, response.views);
      self.vineyard.update_url = 'vineyard/update';
      self.vineyard.get_url = 'vineyard/get';
      self.invoke('initialize');
      /*
      var content_element = $('.editor .content');
      if (content_element.length > 0) {
        self.content_panel = Content_Panel.create(content_element);
        self.content_panel.set_garden(self);
      }
      */
      
      if (typeof next_action == 'function')
        next_action.apply(self);
      
      self.process_request();
    }); 
  },
  initialize_query: function(query) {
    
    return query;
  },
  goto_item: function(trellis_name, id) {
    var self = this;
    if (typeof trellis_name == 'object')
      trellis_name = trellis_name.name;
    var query = this.initialize_query('vineyard/get?trellis=' + trellis_name + '&id=' + id);
    Bloom.get(query, function(response) {
      var item = self.vineyard.trellises[trellis_name].create_seed(response.objects[0]);
      self.content_panel.load_edit(item);
      self.invoke('edit', item);

    });
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
  process_request: function() {
    if (this.request.trellis) {
      if (this.request.action == 'create') {
        this.invoke('create', this.vineyard.trellises[this.request.trellis]);
      //          Garden.content_panel.load_create(Garden.vineyard.trellises[request.trellis]);
      }
      else if (this.request.id) {
        this.goto_item(this.request.trellis, this.request.id);
      }
      else {
        this.invoke('index', this.request.trellis);

      }
    }
    //        var query = Garden.initialize_query('/jester/jest/get_root_quests');
    //        Bloom.get(query, function(response) {
    //          quests.set_seed(response.objects);
    //        });
    //Garden.content_panel.load_index(request.trellis);
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
      
    if (garden.ajax_prefix)
      Bloom.ajax_prefix = garden.ajax_prefix;
    if (garden.ajax_path)
      Bloom.ajax_prefix = garden.ajax_path;
    
    if (garden.block_path)
      Block.source_path = garden.block_path;
      
    if (typeof garden.initialize_core == 'function')
      garden.initialize_core();
      
    if (garden.blocks) {
      for (var i in garden.blocks) {
        var block = garden.blocks[i];
        Bloom.Ground.add(i, block, Block.load_library);    
      }
    }
      
    if (typeof garden.load == 'function')
      garden.load(Bloom.Ground);
    
    if (Bloom.Ground.is_empty()) {
      Bloom.Ground.fertilize(function() {
        Garden.methods.grow.call(garden, garden.grow);
      });
    }
    else
    {
      Garden.methods.grow.call(garden, garden.grow);
    }
  });
}

Garden.get_path_array = function(path, base) {
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

var Index_Item = Flower.sub_class('Index_Item', {
  initialize: function() {
    this.element = $('<div><a href="">' + this.seed.name + '</a></div>');
    this.element.find('a').attr('href', '?trellis=' + this.seed.trellis.name + '&id=' + this.seed.id);
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
