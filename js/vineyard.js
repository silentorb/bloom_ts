var Vineyard = (function () {
  var Vineyard = Meta_Object.subclass('Framework', {
    trellises: {},
    vines: {},
    meta_objects: {},
    default_arbor: null,
    initialize: function(middle_data, bloom_data) {
      var x, trellis;

      // Merge client specific settings into the main schema.
      for (x in bloom_data) {
        if (middle_data[x]) {
          this.extend_trellis(middle_data[x], bloom_data[x]);
        }
      }
      
      for (x in middle_data) {
        trellis = Trellis.create(x, middle_data[x], this);        
        this.trellises[x] = trellis;
      }
      
      for (x in this.trellises) {
        this.trellises[x].initialize_properties();
      }
    },
    extend_trellis: function(target, source) {
      var y;
      if (!source.properties || !target.properties)
        return;
        
      for (y in source.properties)  {
        MetaHub.extend(target.properties[y], source.properties[y]);
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
    'reference': undefined,
    'list': function(item, property) {
      var name = property.name;
      item.optimize_getter(name, property.target_trellis.name);
      return item[name];
    }
  }
  
  /*
 *  Trellis = Table Schema
 */
  var Trellis = Meta_Object.subclass('Trellis', {
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
        property.parent = this;
        if (property.type == 'list' || property.type == 'reference') {
          // Convert string to object reference.
          property.target_trellis = this.vineyard.trellises[property.trellis];
          if (!property.target_trellis)
            throw new Error("Target Trellis is undefined.");
        //          property.target_trellis = property.trellis;
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
              else if (default_value !== undefined) {
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
          //            delete item[name];  
          }
        }
      }
      return item;
    }
  });

  var Seed = Meta_Object.subclass('Seed', {
    deleted: {},
    initialize: function(source, trellis) {
      source = source || {};
      MetaHub.extend(this, source);
      this.value = Meta_Object.value;
      this.trellis = trellis;
      this.listen(this, 'connect', this.on_child_connect);
    },
    on_child_connect: function(child, type) {
      this.listen(child, 'delete', function(child) {
        if (!this.deleted[type])
          this.deleted[type] = [];
        
        this.deleted[type].push(child);
      });
    },
    plant: function() {
      var property, name, type, item = {}, p;
      for (p in this.trellis.properties) {
        if (p == 'type')
          continue;
        
        property = this.trellis.properties[p];
        name = property.name;
        type = property.type;
        var value = this[name];
        
        if (value !== undefined && value !== null) {
          if (type == 'list') {
            item[name] = value.map(function(x) {
              return x.id;
            });
            
            if (value.deleted && value.deleted.length > 0) {
              item[name + '_deleted'] = value.deleted.map(function(x) {
                return x.id;
              });
            }
          }
          else if (type == 'reference') {
            item[name] = value.id;
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
      if (!trellis)
        throw new Error('Trellis is undefined');
      
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
  
  /*
*  Vine = Form Field
*/
  var Vine = Bloom.Flower.subclass('Vine', {
    initialize: function() {
      var self = this, seed = this.seed;
      this.seed = seed.seed; // Unbox the real seed from the containing temp seed.
      this.property = seed.property;
      this.trellis = seed.trellis || this.property.parent;
      this.name = seed.name = seed.name || this.property.name;
      this.owner = seed.owner;

      this.listen(this.owner, 'change.' + this.name, function(value) {
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
    
  var Vine_Skin = Bloom.Flower.subclass('Vine_Skin', {
    block: 'vine-skin',
    initialize: function() {            
      var label = this.element.find('.name');
      label.text(Vine.pretty_name(this.seed.name));
      this.element.addClass(this.seed.property.type);
      this.append(this.seed);
    }
  });
    
  var String_Vine = Vine.subclass('String_Vine', {
    block: 'string-vine',
    initialize: function() {
      var self = this, input = this.element;
      
      input.attr('name', this.name);
      input.val(this.seed);
      input.focus(function() {
        input.select();
      });
      
      Bloom.watch_input(input, function(value) {
        if (self.type == 'double')
          value = parseFloat(value);
        
        Vine.update_seed(self, value);
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
  
  var Text_Vine = String_Vine.subclass('Text_Vine', {
    block: 'text-vine',
    get_text_element: function() {
      return this.element.find('textarea');
    }    
  });

  var Reference_Vine = Vine.subclass('Reference_Vine', {
    block: 'reference-vine',
    initialize: function() {
      var self = this;
      Bloom.get(this.trellis.vineyard.get_url + '?trellis=' + this.property.trellis, function(response) {
        var select = Bloom.Combo_Box.create(response.objects);
        self.append(select);
        if (!self.seed) {
          self.seed = self.owner[self.property.name] = {
            id: select.get_selection().id
          };
        }
        var reference = self.seed;
        //        select.set_value(self.owner[self.property.name]);
        for (var i = 0; i < response.objects.length; i++) {
          if (response.objects[i].id === reference.id) {
            select.set_value(i);
            break;
          }
        }

        self.listen(select, 'change', function(option) {
          //          self.owner[self.property.name] = option.id;
          reference.id = option.id;
        });
      });
    }
  });

  var List_Vine = Vine.subclass('List_Vine', {
    block: 'list-vine',
    initialize: function() {
      var self = this;
      
      var list = this.list_type.create(this.seed, this.element);
      list.element.attr('name', this.name);      
      this.input = list;
      
      this.element.find('.add').click(function(e) {
        e.preventDefault();
        
        // Discrete lists only have unique items,
        // so anytime the user adds an item to the list
        // a new item must be created.  Otherwise
        // the user will select from an existing item.
        // (Eventually non-discrete lists could give the
        // option to either select an existing item or
        // create a new item on the spot.
        if (self.property.discrete)
          self.create_new_entry(list);
        else
          self.create_list_selection(list);
      });
    },
    create_list_selection: function(main_list) {
      var reference = Seed.create({}, this.trellis);
      reference.connect(this.owner, 'parent', this.property.target_trellis.name);      
        
      var select = Reference_Vine.create({
        owner: this.owner,
        property: this.property,
        seed: reference
      });
      select.listen(select, 'disconnect-all', function() {
        reference.disconnect_all();
      });
      this.wrap_dynamic_vine_modifier(main_list, select)
    },
    create_new_entry: function(main_list) {
      var vineyard = this.property.parent.vineyard;
      var arbor_type = vineyard.default_arbor || Arbor;
        
      var arbor = arbor_type.create({
        seed: this.property.target_trellis.create_seed(),
        trellis: this.property.target_trellis
      });
      
      this.wrap_dynamic_vine_modifier(main_list, arbor);
    },
    wrap_dynamic_vine_modifier: function(main_vine, dynamic_vine) {
      var flower = Flower.create($('<div/>'));
      flower.append(dynamic_vine);
      var delete_flower = $('<a class="delete" href="">X</a>');
      flower.element.append(delete_flower);
      main_vine.child_connected(flower);
      delete_flower.click(function(e) {
        e.preventDefault();
        dynamic_vine.invoke('delete');
        flower.disconnect_all();
      });
    }
  });
  
  Vineyard.properties.default_vine = Text_Vine;
  Vineyard.properties.vines = {
    "string": String_Vine,
    "text": Text_Vine,
    "reference": Reference_Vine,
    "list": List_Vine
  };
  
  /*
*  Arbor = FORM
*/
  var Arbor = Bloom.Flower.subclass('Arbor', {
    block: 'list',
    initialize: function() {
      this.listen(this, 'connect.child', Bloom.List.methods.child_connected);
      this.listen(this, 'disconnect.child', Bloom.List.methods.remove_element);
      var list_element = this.element.find('ul');
      if (!list_element.length)
        list_element = this.element;
      this.list = List.create(list_element);
      if (!this.seed)
        return;
            
      var options = this.seed;
      this.seed = options.seed;
      this.trellis = options.trellis;
      this.vineyard = this.trellis.vineyard;      
      this.generate(this.seed, this.trellis);
    },
    create_flower: function(seed, property) {
      var control_type = this.get_flower_type(property.type);
      var control = control_type.create({
        owner: seed,
        property: property,
        seed: Meta_Object.value.call(seed, property.name)
      });
      
      return control;
    },
    generate: function(seed, type_info) {      
      this.list.empty();
      
      for (var name in type_info.properties) {
        var property = type_info.properties[name];
        // if (Meta_Object.has_property(seed, name) && 
        if (!property.readonly && property.visible !== false) {
          var control = this.create_flower(seed, property);
          var skin = Vine_Skin.create(control);
          this.list.connect(skin, 'child', 'parent');          
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