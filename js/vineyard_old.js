var Vineyard = (function () {
  var Vineyard = Meta_Object.subclass('Framework', {
    trellises: {},
    vines: {},
    views: {},
    meta_objects: {},
    default_arbor: null,
    max_plant_depth: 16,  // A limit against infinite recursion in planting.
    initialize: function (middle_data, bloom_data) {
      var x, trellis;

      // Merge client specific settings into the main schema.
      //      for (x in bloom_data) {
      //        if (middle_data[x]) {
      //          this.extend_trellis(middle_data[x], bloom_data[x]);
      //        }
      //      }
      //
      this.views = bloom_data;

      for (x in middle_data) {
        trellis = Trellis.create(x, middle_data[x], this);
        this.trellises[x] = trellis;
      }
      for (x in this.trellises) {
        this.trellises[x].initialize_properties();
      }
    },
    create_and_attach_vine: function (seed, property, list) {
      var control = this.create_vine(seed, property);
      var skin = Vine_Skin.create(control);
      skin.element.addClass('field-' + property.name.replace(/ /g, '-'));
      list.connect(skin, 'child', 'parent');
      return skin;
    },
    create_vine: function (seed, property) {
      var control_type = this.get_vine_type(property);
      var control = control_type.create({
        owner: seed,
        property: property,
        seed: Seed.value(seed, property.name)
      });

      return control;
    },
    get_vine_type: function (property) {
      var type = property.type;
      if (property.vine && this.vines[property.vine])
        return this.vines[property.vine];

      if (property.trellis && this.vines[property.trellis])
        return this.vines[property.trellis];

      if (this.vines[type])
        return this.vines[type];
      else
        return this.default_vine;
    },
    extend_trellis: function (target, source) {
      var y;
      if (!source.properties || !target.properties)
        return;

      for (y in source.properties) {
        if (!target.properties[y])
          target.properties[y] = {};

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
    'list': function (item, property) {
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
    initialize: function (name, source, vineyard) {
      this.name = name;
      this.vineyard = vineyard;
      MetaHub.extend(this, source);
      this.properties = {};

      // Add source properties after any possible parent properties.
      MetaHub.extend(this.properties, source.properties);
    },
    initialize_properties: function () {
      if (typeof this.parent === 'string') {
        if (!this.vineyard.trellises[this.parent])
          throw new Error('No Trellis exists for ' + this.name + ' parent: ' + this.parent + '.');

        // Convert string to object reference.
        this.parent = this.vineyard.trellises[this.parent];
        MetaHub.extend(this.properties, this.parent.properties);
      }

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
    create_seed: function (source) {
      var i, seed, property;
      if (source) {
        if (typeof source != 'object') {
          //var id = source.id || source;
          var seed = this.get_seed_by_id(source);
          if (seed)
            return seed;
        }
        else {
          if (source.meta_source == Seed)
            return source;

          if (source.id) {
            var seed = this.get_seed_by_id(source.id);
            if (seed) {
              this.populate_seed(seed, source);

              return seed;
            }
          }
        }
      }
      seed = Seed.create(source, this);
      if (!source)
        seed._plantable = false;

      seed.connect(this, 'trellis', 'seed');
      this.populate_seed(seed, source);

      this.invoke('create-seed', seed, this);
      return seed;
    },
    get_seed_by_id: function (id) {
      var i, seed, seeds = this.get_connections('seed');
      for (i = 0; i < seeds.length; i++) {
        seed = seeds[i];
        if (seed.id == id) {
          return seed;
        }
      }

      return null;
    },
    get_plural: function () {
      if (this.plural)
        return this.plural;

      return this.name + 's';
    },
    get_reference: function (trellis_name) {
      for (var i in this.properties) {
        var property = this.properties[i];
        if (property.trellis == trellis_name)
          return property;
      }

      return null;
    },
    is_a: function (trellis) {
      var name;
      if (!trellis)
        return false;

      if (typeof trellis === 'string')
        name = trellis;
      else
        name = trellis.name;

      if (!name)
        return false;

      trellis = this;

      do {
        if (trellis.name == name)
          return true;

        trellis = trellis.parent;
      }
      while (trellis);

      return false;
    },
    populate_seed: function (seed, source) {
      var property, i;
      if (typeof source != 'object') {
        var key = source
        source = {}
        source[this.primary_key] = key;
      }

      // Need to get id out of the way before dealing with
      // any reference properties that could be pointing back
      // at this seed.
      seed[this.primary_key] = source[this.primary_key];

      for (var p in this.properties) {
        property = this.properties[p];
        var name = property.name;

        if (this.primary_key == name) {
          seed[name] = source[name];
        }
        else {
          if (property.private)
            continue;

          if (source[name] === undefined) {
            if (property.insert_trellis) {
              seed[name] = this.name;
            }
            else {
              var default_value = Vineyard.default_values[property.type];
              if (typeof default_value == 'function') {
                seed[name] = default_value(seed, property);
              }
              else if (default_value !== undefined) {
                seed[name] = default_value;
              }
            }
          }
          else if (property.type == 'list') {
            var list = source[name];

            // Check if property already exists so it isn't added multiple times
            if (typeof seed[name] !== 'object')
              seed.optimize_getter(name, property.target_trellis.name);

            if (list && list.length) {
              for (i = 0; i < list.length; i++) {
                if (list[i].meta_source === Seed)
                  continue;

                //var child = list[i] = Seed.create(list[i], property.target_trellis);
                var is_object = typeof list[i] === 'object'
                var child = list[i] = property.target_trellis.create_seed(list[i]);
                if (!is_object)
                  child._is_proxy = true;

                child.connect(seed, 'parent', property.target_trellis.name);
              }
            }
          }
          else if (property.type == 'reference') {

            if (seed[name]) {
              if (seed[name].meta_source === Seed)
                continue;

              if (seed[name].id == source[name]) {
                seed[name]._is_proxy = true;
                continue;
              }
            }

            if (!source[name])
              continue;

            seed[name] = property.target_trellis.create_seed(source[name]);
            if (typeof source[name] !== 'object')
              seed[name]._is_proxy = true;
          }
          else {
            if (typeof source[name] !== 'undefined')
              seed[name] = source[name];
          }
        }
      }

      for (var k in source) {
        if (!this.properties[k])
          seed[k] = source[k];
      }
    }
  });

  var Seed = Meta_Object.subclass('Seed', {
    _deleted: {},
    initialize: function (source, trellis) {
      this.plant = this._plant;
      source = source || {};
      if (typeof source != 'object')
        source = {
          id: source
        };

      //MetaHub.extend(this, source);
      if (!this.trellis)
        this.trellis = trellis;

      this.value = Meta_Object.value;
      this.listen(this, 'connect.child', this._on_child_connect);
    },
    _delete: function (silent, success) {
      this._deleted = true;
      this._plant(silent, success);
    },
    _on_child_connect: function (child, type) {
      this.listen(child, 'delete', function (child) {
        if (!this.deleted[type])
          this.deleted[type] = [];

        this.deleted[type].push(child);
      });
    },
    _plant: function (silent, success) {
      if (typeof silent === 'function') {
        success = silent;
        silent = false;
      }
      Seed.plant(this, this.trellis, silent, success);
    }
  });

  Seed.plant = function (seed, trellis, silent, success) {
    if (typeof silent === 'function') {
      success = silent;
      silent = false;
    }

    var seeds, data = {
      objects: [ ]
    };

    if (!Object.is_array(seed)) {
      seeds = [ seed ];
    }
    else {
      seeds = seed;
    }

    for (var i = 0; i < seeds.length; ++i) {
      if (seeds[i]._is_proxy)
        throw new Error("Cannot plant proxy seeds.");

      trellis.invoke('plant', seeds[i]);
      data.objects.push(Seed.prepare_for_planting(seeds[i], trellis));
    }

    var primary_key = trellis.primary_key;

    var url = trellis.vineyard.garden.irrigation.get_plant_url() + Bloom.render_query({
      'XDEBUG_SESSION_START': 'netbeans-xdebug'
    });
    Bloom.post_json(url, data, function (response) {
      if (response.success && Bloom.output) {
        if (!Object.is_array(seed)) {
          if (seed[primary_key] === undefined)
            seed[primary_key] = response[primary_key];
        }
        if (typeof success === 'function') {
          success(seed, response);
        }
        if (silent)
          return;

        Bloom.output({
          message: 'Saved.'
        });

        trellis.vineyard.invoke('seed-updated', seed, response);
      }
    }, function (jqXHR, textStatus, errorThrown) {

    });
  }

  Seed.prepare_for_planting = function (seed, trellis, bag) {
    bag = bag || {
      depth: 0,
      seeds: {}
    }
    //    if (bag.depth > trellis.vineyard.max_plant_depth)
    //      throw new Error('Infinite loop detected during planting.');

    ++bag.depth;
    var result, key = 'id';

    if (typeof seed != 'object')
      return seed;
//      throw new Error('Seed.prepare_for_planting() requires an object');

    trellis = seed.trellis || trellis;
    if (!trellis)
      throw new Error('Missing trellis.');

    var property, name, type, item = {}, p;
    var primary_key = trellis.primary_key;

    if (seed._is_proxy)
      return seed[primary_key];

    if (typeof seed.guid === 'string') {
      if (bag.seeds[seed.guid]) {
        return seed[primary_key];
      }
      bag.seeds[seed.guid] = seed;
    }

    if (seed._deleted === true) {
      item[primary_key] = seed[primary_key];
      item._deleted = true;
    }
    if (seed._remove === true) {
      item._remove = true;
    }
    for (p in trellis.properties) {
      property = trellis.properties[p];

      if (item._deleted && property.name[0] !== '_')
        continue;

      if (p != primary_key && (property.private || property.readonly))
        continue;

      name = property.name;
      type = property.type;
      var value = seed[name];

      if (value !== undefined) {
        if (type == 'list') {
          item[name] = value.map(function (x) {
            return Seed.prepare_for_planting(x, property.target_trellis, bag)
          });

          if (value._deleted && value._deleted.length > 0) {
            item[name + '_deleted'] = value._deleted.map(function (x) {
              return x.id;
            });
          }
        }
        else if (type == 'reference' && typeof value === 'object') {
          value = Seed.prepare_for_planting(value, property.target_trellis, bag);
          if (value !== undefined)
            item[name] = value;
        }
        else {
          item[name] = value;
        }
      }
    }
    item.trellis = trellis.name;

    --bag.depth;
    return item;
  }

  var Seed_List = Meta_Object.subclass('Seed_List', {
    seed_name: 'objects',
    initialize: function (trellis) {
      this.optimize_getter('children', 'child');
      if (!trellis)
        throw new Error('Trellis is undefined');

      this.trellis = trellis;
    },
    add_children: function (seed) {
      for (var x = 0; x < seed.length; x++) {
        var child = this.trellis.create_seed(seed[x]);
        this.connect(child, 'child', 'parent');
      }
    },
    update: function () {
      var self = this;
      if (this.query == undefined) {
        return;
      }
      var query = this.query();
      if (!query) {
        return;
      }

      this.invoke('start-update')
      Bloom.get(query, function (response) {
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

  Seed.value = function (seed, name, value) {
    if (typeof seed.value === 'function') {
      return seed.value(name, value);
    }

    if (value === undefined) {
      return seed[name];
    }
    else {
      return seed[name] = value;
    }
  }

  /*
   *  Vine = Form Field
   */
  var Vine = Bloom.Flower.subclass('Vine', {
    initialize: function () {
      var self = this, seed = this.seed;
      this.seed = seed.seed; // Unbox the real seed from the containing temp seed.
      this.property = seed.property;
      this.trellis = seed.trellis || this.property.parent;
      this.name = seed.name = seed.name || this.property.name;
      this.owner = seed.owner;

      this.listen(this.owner, 'change.' + this.name, function (value) {
        self.update_element(value);
      });
    }
  });

  MetaHub.extend(Vine, {
    pretty_name: function (name) {
      var words = name.split(/[_\s\.\-]/);

      words = words.map(function (x) {
        return x[0].toUpperCase() + x.slice(1);
      });

      return words.join(' ');
    },
    update_seed: function (seed, value) {
      seed.owner.value(seed.name, value, this);
    }
  });

  var Vine_Skin = Bloom.Flower.subclass('Vine_Skin', {
    block: 'vine-skin',
    initialize: function () {
      var label = this.element.find('label');
      if (this.seed.property.label === false
        || this.seed.property.label === null) {
        label.remove();
      }
      else {
        if (this.seed.property.label === undefined)
          label.text(Vine.pretty_name(this.seed.property.name));
        else
          label.text(this.seed.property.label);
      }

      this.element.addClass(this.seed.property.type);
      this.append(this.seed);
    }
  });

  var String_Vine = Vine.subclass('String_Vine', {
    block: 'string-vine',
    initialize: function () {
      var input = this.element;

      input.attr('name', this.name);
      input.val(this.seed);
      input.focus(function () {
        input.select();
      });

      this.watch_input();

      this.input = input;
    },
    get_text_element: function () {
      return this.element.find('input');
    },
    watch_input: function () {
      var self = this;
      Bloom.watch_input(this.element, function (value) {
        if (self.type == 'double')
          value = parseFloat(value);

        Vine.update_seed(self, value);
      });
    },
    update_element: function (value) {
      this.input.val(value);
    }
  });

  var Checkbox_Vine = Vine.subclass('Checkbox_Vine', {
    block: 'checkbox-vine',
    initialize: function () {
      var self = this, input = this.element;

      input.attr('name', this.name);
      input.val(this.seed);
      input.focus(function () {
        input.select();
      });

      Bloom.watch_input(input, function (value) {
        Vine.update_seed(self, value);
      });

      this.input = input;
    },
    get_text_element: function () {
      return this.element.find('input');
    },
    update_element: function (value) {
      this.input.val(value);
    }
  });

  var Date_Vine = Vine.subclass('Date_Vine', {
    block: 'string-vine',
    initialize: function () {
      var self = this, input = this.element;

      // Only add positive values
      if (this.seed) {
        var date = new Date(this.seed * 1000);
        var date_string = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
        input.val(date_string);
      }
      Bloom.watch_input(input, function (value) {
        if (value) {
          var date = new Date(value);
          value = date.getTime() / 1000;
        }

        Vine.update_seed(self, value);
        // skipping update_seed for now because it's throwing a timestamp into the field.
        //self.owner[self.name] = value;
      });

      this.input = input;

      if (jQuery.datepicker) {
        input.datepicker();
      }
    },
    get_text_element: function () {
      return this.element.find('input');
    },
    update_element: function (value) {
      var date = new Date(value * 1000);
      value = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
      this.input.val(value);
    }
  });

  var Text_Vine = String_Vine.subclass('Text_Vine', {
    block: 'text-vine',
    get_text_element: function () {
      return this.element.find('textarea');
    }
  });

  var Reference_Vine = Vine.subclass('Reference_Vine', {
    block: 'reference-vine',
    initialize: function () {
      var self = this;

      this.get_options(function (options) {
        var select = Bloom.Combo_Box.create(options);
        self.append(select);
//        if (!self.seed) {
//          self.seed = self.owner[self.property.name] = {
//            id: select.get_selection().id
//          };
//        }
        var reference = self.seed;
        //        select.set_value(self.owner[self.property.name]);
//        for (var i = 0; i < options.length; i++) {
//          if (options[i].id === reference.id) {
//            select.set_value(i);
//            break;
//          }
//        }

        self.listen(select, 'change', function (option) {
          //          self.owner[self.property.name] = option.id;
          self.owner[self.property.name] = option[self.get_target_trellis().primary_key];
          var k = self;
        });
      });
    },
    get_options: function (success) {
      // Dummy response.  This function is made to be overriden.
      success([]);
    },
    get_target_trellis: function () {
      return this.trellis.vineyard.trellises[this.property.trellis];
    }
  });

  var List_Vine = Vine.subclass('List_Vine', {
    block: 'list-vine',
    initialize: function () {
      var self = this;

      var list = this.list_type.create(this.seed, this.element);
      list.element.attr('name', this.name);
      this.input = list;

      this.element.find('.add').click(function (e) {
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
    create_list_selection: function (main_list) {
      var reference = Seed.create({}, this.trellis);
      reference.connect(this.owner, 'parent', this.property.target_trellis.name);

      var select = Reference_Vine.create({
        owner: this.owner,
        property: this.property,
        seed: reference
      });
      select.listen(select, 'disconnect-all', function () {
        reference.disconnect_all();
      });
      this.wrap_dynamic_vine_modifier(main_list, select)
    },
    create_new_entry: function (main_list) {
      var vineyard = this.property.parent.vineyard;
      var arbor_type = vineyard.default_arbor || Natural_Arbor;

      var arbor = arbor_type.create({
        seed: this.property.target_trellis.create_seed(),
        trellis: this.property.target_trellis
      });

      this.wrap_dynamic_vine_modifier(main_list, arbor);
    },
    wrap_dynamic_vine_modifier: function (main_vine, dynamic_vine) {
      var flower = Flower.create($('<div/>'));
      flower.append(dynamic_vine);
      var delete_flower = $('<a class="delete" href="">X</a>');
      flower.element.append(delete_flower);
      main_vine.child_connected(flower);
      delete_flower.click(function (e) {
        e.preventDefault();
        dynamic_vine.invoke('delete');
        flower.disconnect_all();
      });
    }
  });

  Vineyard.properties.default_vine = String_Vine;
  Vineyard.properties.vines = {
    "bool": Checkbox_Vine,
    "list": List_Vine,
    "string": String_Vine,
    "text": Text_Vine,
    "reference": Reference_Vine,
    "date": Date_Vine,
    "datetime": Date_Vine
  };

  /*
   *  Arbor is a form used to edit a seed
   */
  var Arbor = Bloom.Flower.subclass('Arbor', {
    block: 'list',
    override_parameters: true,
    initialize: function (seed, trellis, view) {
      if (trellis !== undefined)
        this.trellis = trellis;

      if (view !== undefined)
        this.view = view;

      if (!seed)
        return;

      this.seed = seed;

      if (trellis) {
        this.vineyard = trellis.vineyard;
        if (this.vineyard.garden)
          this.garden = this.vineyard.garden;

        if (view === undefined && this.vineyard.views[trellis.name]) {
          this.view = this.vineyard.views[trellis.name];
        }
      }
    },
    generate_vines: function (seed, type_info) {
      this.list.empty();
      var properties = {}, p, vineyard = this.trellis.vineyard;
      for (p in type_info.properties) {
        properties[p] = this.get_view_property(type_info.properties[p]);
      }
      properties = Arbor.sort_vines(properties);
      for (var i = 0; i < properties.length; i++) {
        // In explicit mode original properties are not shown if they aren't also defined in the view.
        if (this.view && this.view.explicit && !this.view.properties[properties[i].name])
          continue;

        var property = properties[i];
        if (!property.readonly && property.visible !== false) {
          vineyard.create_and_attach_vine(seed, property, this.list);
        }
      }
    },
    get_view_property: function (original_property) {
      if (!this.view)
        return original_property;

      if (this.view.properties[original_property.name]) {
        var property = MetaHub.extend({}, original_property);
        MetaHub.extend(property, this.view.properties[original_property.name]);
        return property;
      }

      return original_property;
    },
    grow: function () {

    },
    seed_to_element: function (seed) {
      if (!this.element)
        return;

      this.element.find('*[bind]').each(function () {
        var element = $(this);
        var bind = element.attr('bind');
        if (seed.hasOwnProperty(bind)) {
          var value = seed[bind];
          Flower.set_value(element, value);
        }
      });
    },
    submit: function () {
      var self = this;
      if (typeof this.seed._plant == 'function') {
        this.seed._plant(function () {
          self.invoke('finish', self.seed);
        });
      }
    }
  });

  Arbor.sort_vines = function (properties) {
    var items = [];
    for (var name in properties) {
      items.push(properties[name]);
    }
    return items.sort(function (a, b) {
      //      console.log(x.name, x.weight || 0);
      return (a.weight || 0) - (b.weight || 0);
    });
  }

  var Natural_Arbor = Arbor.subclass('Natural_Arbor', {
    initialize: function (seed, trellis, view) {
      this.listen(this, 'connect.child', Bloom.List.methods.child_connected);
      this.listen(this, 'disconnect.child', Bloom.List.methods.remove_element);
      var list_element = this.element.find('ul');
      if (!list_element.length)
        list_element = this.element;
      this.list = List.create(list_element);

      if (this.trellis) {
        this.generate_vines(this.seed, this.trellis);
      }
    }
  });

  Vineyard.import_all = function () {
    MetaHub.extend(MetaHub.Global, Vineyard.classes);
  }
  return Vineyard;
})();