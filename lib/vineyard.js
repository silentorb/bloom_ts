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
      
      for (var x in this.trellises) {
        this.trellises[x].initialize_properties();
      }
    }    
  });
  
  MetaHub.current_module = Vineyard;

  Vineyard.default_values = {
    'string': '',
    'text': '',
    'int': 0,
    'float': 0,
    'bool': false,
    'reference': null,
    'list': function(item, property) {
      var name = property.name;
      item.optimize_getter(name, property.target_trellis.name);
      return item[name];
    }
  }
  
  var Trellis = Meta_Object.sub_class('Trellis', {
    primary_key: 'id',
    initialize: function(name, source, vineyard) {
      this.name = name;
      this.vineyard = vineyard;
      MetaHub.extend(this, source);      
      this.properties = {};
      if (this.parent) {
        // Convert string to object reference.
        this.parent = this.vineyard.trellises[this.parent];
        MetaHub.extend(this.properties, this.parent.properties);
      }
      
      // Add source properties after any possible parent properties.
      MetaHub.extend(this.properties, source.properties);
    },
    initialize_properties: function() {            
      for (var p in this.properties) {
        var property = this.properties[p];
        property.name = p;
        property.trellis = this;
        if (property.type == 'list' || property.type == 'reference') {
          // Convert string to object reference.
          property.target_trellis = this.vineyard.trellises[property.reference_trellis]
        }
        if (property.name == this.primary_key && property.readonly === undefined) {
          property.readonly = true;
        }
      }
    },
    create_seed: function(source) {
      // Here source and item stay pointing at the same object
      // but I want to distinguish between them because
      // that might not be the case with all Trellises.
      var property, item = Seed.create(source, this);
      for (var p in this.properties) {
        property = this.properties[p];
        var name = property.name;

        if (this.primary_key != name) {
          if (item[name] === undefined) {
            if (property.insert_trellis) {
              item[name] = this.name;
            }
            else {
              var default_value = Vineyard.default_values[property.type];
              if (typeof default_value == 'function') {
                item[name] = default_value(item, property);
              }
              else {
                item[name] = default_value;
              }
            }
          }
          else if (property.type == 'list') {
            var list = item[name];
            delete item[name];
            item.optimize_getter(name, property.target_trellis.name);
            if (list && list.length) {
              for (var i = 0; i < list.length; i++) {
                var child = list[i] = Seed.create(list[i], property.target_trellis);
                child.connect(item, 'parent', property.target_trellis.name);
              }
            }
          }
          else if (property.type == 'reference') {
          // Not yet implemented
          }
        }
      }
      return item;
    }
  });

  var Seed = Meta_Object.subclass('Seed', {
    initialize: function(source, trellis) {
      MetaHub.extend(this, source);
      this.value = Meta_Object.value;
      this.trellis = trellis;
    },
    plant: function() {
      var property, name, type, item = {};
      for (var p in this.trellis.properties) {
        property = this.trellis.properties[p];
        name = property.name;
        type = property.type;
        var value = this[name];
        
        if (value !== undefined) {
          if (type == 'list') {
            item[name] = value.map(function(x) {
              return x.id
            });
          }
          else if (type == 'reference') {
            
          }
          else {
            item[name] = value;
          }
        }
      }
      item.trellis = this.trellis.name
      var data = {
        objects: [ item ]
      };
      Bloom.post(this.trellis.vineyard.update_url + '?XDEBUG_SESSION_START=netbeans-xdebug', data, function(response) {
        if (response.success && Bloom.output) {
          Bloom.output({
            message: 'Saved.'
          });
        }
      });
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
        var child = this.trellis.create_seed(seed[x]);
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
      this.property = this.seed.property;
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
    
  var String_Vine = Vine.sub_class('String_Vine', {
    block: 'string-vine',
    initialize: function() {
      var seed = this.seed;
      var name = seed.name;
      
      var label = this.element.find('label');
      label.text(Vine.pretty_name(name));
      label.attr('for', name);
      
      var input = this.get_text_element();
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
    get_text_element: function() {
      return this.element.find('input');
    },
    update_element: function(value) {
      this.input.val(value);
    }
  });
  
  var Text_Vine = String_Vine.sub_class('Text_Vine', {
    block: 'text-vine',
    get_text_element: function() {
      return this.element.find('textarea');
    }    
  });

  var List_Vine = Vine.sub_class('List_Vine', {
    block: 'list-vine',
    initialize: function() {
      var self = this;
      var seed = this.seed;
      var name = seed.name;
      
      var label = this.element.find('label');
      label.text(Vine.pretty_name(name));
      label.attr('for', name);
      
      var value = Meta_Object.value.call(seed.owner, name);
      var list = this.list_type.create(value, this.element.find('ul'));
      list.element.attr('name', name);      
      this.input = list;
      
      this.element.find('.add').click(function(e) {
        e.preventDefault();
        Bloom.get(self.property.trellis.vineyard.get_url + '?trellis=' + self.property.reference_trellis, function(response) {          
          var select = Bloom.Combo_Box.create(response.objects);
          var flower = Flower.create($('<div/>'));
          flower.append(select);
          var delete_flower = $('<a class="delete" href="">X</a>');
          flower.element.append(delete_flower);
          list.child_connected(flower);
          delete_flower.click(function(e) {
            e.preventDefault();
            reference.disconnect_all();
            flower.disconnect_all();
          });
          var reference = Seed.create({}, self.property.trellis);
          reference.id = select.get_selection().id;
          reference.connect(seed.owner, 'parent', self.property.target_trellis.name);
          self.listen(select, 'change', function(option) {
            reference.id = option.id;
          });
        });
      });
    }
  });
  
  Vineyard.properties.default_vine = Text_Vine;
  Vineyard.properties.vines = {
    "string": String_Vine,
    "text": Text_Vine,
    "list": List_Vine
  };
  
  var Arbor = Bloom.Flower.sub_class('Arbor', {
    initialize: function() {
      var self = this;
      this.listen(this, 'connect.child', Bloom.List.methods.child_connected);
      this.listen(this, 'disconnect.child', Bloom.List.methods.remove_element);
      this.list = List.create(this.element.find('ul'));
      if (!this.seed)
        return;
            
      var options = this.seed;
      this.seed = options.seed;
      this.trellis = options.trellis;
      this.vineyard = this.trellis.vineyard;      
      this.generate(this.seed, this.trellis);
      
      this.element.find('input[type=submit], button[type=submit]').click(function(e) {
        self.seed.plant();
      //        e.preventDefault();
      //        var data = {
      //   
      //        };
      //        Bloom.post(this.vineyard.update_url, data, function(response) {
      //          
      //        });
      });
    },
    create_flower: function(seed, property) {
      var control_type = this.get_flower_type(property.type);
      var control = control_type.create({
        name: property.name,
        owner: seed,
        type: property.type,
        trellis: property.trellis,
        property: property
      });
      
      return control;
    },
    generate: function(seed, type_info) {      
      this.list.empty();
      
      for (var name in type_info.properties) {
        var property = type_info.properties[name];
        if (Meta_Object.has_property(seed, name) && !property.readonly) {
          var control = this.create_flower(seed, property);
          this.list.connect(control, 'child', 'parent');          
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