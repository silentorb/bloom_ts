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
  content_panel_type: Content_Panel,
  grow: function(next_action) {
    var self = this;
    Bloom.output = this.print;
    var request = Bloom.get_url_properties();
    
    Bloom.get('vineyard/model.json', function(response) {
      self.vineyard = Vineyard.create(response.trellises, response.views);
      self.vineyard.update_url = 'vineyard/update';
      self.vineyard.get_url = 'vineyard/get';
      self.invoke('initialize');
    
      var content_element = $('.editor .content');
      if (content_element.length > 0) {
        self.content_panel = self.content_panel_type.create();
        self.content_panel.set_garden(self);
      }
      
      if (request.trellis) {
        if (request.action == 'create') {
          self.invoke('create', self.vineyard.trellises[request.trellis]);
        //          Garden.content_panel.load_create(Garden.vineyard.trellises[request.trellis]);
        }
        else if (request.id) {
          self.goto_item(request.trellis, request.id);
        }
        else {
          self.invoke('index', request.trellis);

        }
      }
      //        var query = Garden.initialize_query('/jester/jest/get_root_quests');
      //        Bloom.get(query, function(response) {
      //          quests.set_seed(response.objects);
      //        });
      //Garden.content_panel.load_index(request.trellis);
      else {
        self.invoke('other', request);
      }
      
      if (typeof next_action == 'function')
        next_action.apply(self);
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
      
    Bloom.Ground.fertilize(function() {
      Garden.methods.grow.call(garden, garden.grow);
    });
  });
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
