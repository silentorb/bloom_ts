var Vineyard = (function () {
  var Vineyard = {}
  MetaHub.current_module = Vineyard;

  var Trellis = Meta_Object.sub_class('Trellis', {
    types: [],
    initialize: function(data) {
      if (Object.is_array(data)) {
        this.types = data;
      }
    }    
  });
  
  var Vine = Flower.sub_class('Vine', {
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
    
  var Text_Vine = Vine.sub_class('Vine_Text', {
    block: 'text-Vine',
    initialize: function() {
      var seed = this.seed;
      var name = seed.name;
      
      var label = this.element.find('label');
      label.text(Vine.pretty_name(name));
      label.attr('for', name);
      
      var input = this.element.find('input');
      input.attr('name', name);
      input.val(seed.owner.value(name));      
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
  
  var Arbor = List.sub_class('Arbor', {
    initialize: function() {
      if (this.seed) {
        var options = this.seed;
        this.seed = options.seed;
        this.trellis = this.seed;
        this.generate(this.seed, this.trellis);
      }
    },
    create_control: function(seed, name, type) {
      var control = Text_Vine.create({
        name: name,
        owner: seed,
        type: type
      });
      
      return control;
    },
    generate: function(seed, trellis) {      
      this.empty();
      
      for (var name in names) {
        if (Meta_Object.has_property(seed, name)) {
          var control = this.create_control(seed, name, names[name]);
          this.connect(control, 'child', 'parent');          
        }
      }
    }
  });  
  
});