var Vineyard = (function () {
  var Vineyard = Meta_Object.sub_class('Framework', {
    trellises: {},
    vines: {},
    meta_objects: {},
    initialize: function(data) {      
      for (var x in data) {
        var trellis = Trellis.create(x, data[x], this);        
        this.trellises[x] = trellis;
      }      
    }    
  });
  
  MetaHub.current_module = Vineyard;

  var Trellis = Meta_Object.sub_class('Trellis', {
    initialize: function(name, source, vineyard) {
      this.name = name;
      this.vineyard = vineyard;
      MetaHub.extend(this, source);
      var properties = this.properties = source.properties;
      for (var p in properties) {
        var property = properties[p]
        property.name = p;
        property.trellis = this;
      }
    },
    create: function(source) {
      // Here source and item stay pointing at the same object
      // but I want to distinguish between them because
      // that might not be the case with all Trellises.
      var property, item = MetaHub.metanize(source);
      item.trellis = this;
      for (var p in this.properties) {
        property = this.properties[p];
        if (property.type == 'list') {
          var list = source[property.name];
          if (list && list.length) {
            for (var i = 0; i < list.length; i++) {
              list[i].trellis = property;
            }
          }
        }
        else if (property.type == 'reference') {
          // Not yet implemented
        }
      }
      
      return item;
    }
  });

  var Seed_List = Meta_Object.subclass('Seed_List', {
    seed_name: 'objects',
    initialize: function(trellis) {
      this.optimize_getter('children', 'child');
      this.trellis = trellis;
    },
    add_children: function(seed) {
      for (var x = 0; x < seed.length; x++) {
        var child = this.trellis.create(seed[x]);
        this.connect(child, 'child', 'parent');
      }
    },
    update: function() {
      var self = this;
      if (this.query == undefined) {
        return;
      }
      var query = this.query();      
      if (!query) {
        return;
      }
      
      this.invoke('start-update')
      Bloom.get(query, function(response) {
        var seed;
        if (self.seed_name == null || self.seed_name == '')
          seed = response;
        else
          seed = response[self.seed_name];

        self.add_children(seed);
        self.invoke('update', seed, response);
      });
    }
  });
  
  var Vine = Bloom.Flower.sub_class('Vine', {
    initialize: function() {
      var seed = this.seed;
      var self = this;
      this.listen(seed.owner, 'change.' + seed.name, function(value) {
        self.update_element(value);
      });
    }
  });
  
  MetaHub.extend(Vine, {
    pretty_name: function(name) {
      var words = name.split(/[_\s\.\-]/);
      
      words = words.map(function(x) {
        return x[0].toUpperCase() + x.slice(1);
      });
      
      return words.join(' ');
    },
    update_seed: function(seed, value) {      
      seed.owner.value(seed.name, value, this);      
    }
  });
    
  var Text_Vine = Vine.sub_class('Text_Vine', {
    block: 'text-vine',
    initialize: function() {
      var seed = this.seed;
      var name = seed.name;
      
      var label = this.element.find('label');
      label.text(Vine.pretty_name(name));
      label.attr('for', name);
      
      var input = this.element.find('input');
      input.attr('name', name);
      var value = Meta_Object.value.call(seed.owner, name);
      input.val(value);
      input.focus(function() {
        input.select();
      });
      
      Bloom.watch_input(input, function(value) {
        if (seed.type == 'double')
          value = parseFloat(value);
        
        Vine.update_seed(seed, value);
      });
      
      this.input = input;
    },
    update_element: function(value) {
      this.input.val(value);
    }
  });
  
  var List_Vine = Vine.sub_class('List_Vine', {
    block: 'list-vine',
    initialize: function() {
      var seed = this.seed;
      var name = seed.name;
      
      var label = this.element.find('label');
      label.text(Vine.pretty_name(name));
      label.attr('for', name);
      
      var value = Meta_Object.value.call(seed.owner, name);
      for (var x in value) {
        value[x].trellis = this.seed.trellis;
      }
      var list = this.list_type.create(value, this.element.find('ul'));
      list.element.attr('name', name);      
      this.input = list;
    }
  });
  
  Vineyard.properties.default_vine = Text_Vine;
  Vineyard.properties.vines = {
    "string": Text_Vine,
    "list": List_Vine
  };
  
  var Arbor = Bloom.Flower.sub_class('Arbor', {
    block: 'list',
    initialize: function() {
      this.listen(this, 'connect.child', Bloom.List.methods.child_connected);
      this.listen(this, 'disconnect.child', Bloom.List.methods.remove_element);
      if (this.seed) {
        var options = this.seed;
        this.seed = options.seed;
        this.trellis = options.trellis;
        this.generate(this.seed, this.trellis);
      }
    },
    create_flower: function(seed, property) {
      var control_type = this.get_flower_type(property.type);
      var control = control_type.create({
        name: property.name,
        owner: seed,
        type: property.type
      });
      
      return control;
    },
    generate: function(seed, type_info) {      
      this.empty();
      
      for (var name in type_info.properties) {
        var property = type_info.properties[name];
        if (Meta_Object.has_property(seed, name) && !property.readonly) {
          var control = this.create_flower(seed, property);
          this.connect(control, 'child', 'parent');          
        }
      }
    },
    get_flower_type: function(type) {
      var vineyard = this.trellis.vineyard;
      if (vineyard.vines[type])
        return vineyard.vines[type];
      else
        return vineyard.default_vine;
    }
  });  
  
  Vineyard.import_all = function() {
    MetaHub.extend(MetaHub.Global, Vineyard.classes);
  }
  return Vineyard;
})();