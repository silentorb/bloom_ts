var Planter = (function () {
  Planter = {}
  MetaHub.current_module = Planter;
  
  var Field = Flower.sub_class('Field', {
    initialize: function() {
      var seed = this.seed;
      var self = this;
      this.listen(seed.owner, 'change.' + seed.name, function(value) {
        self.update_element(value);
      });
    }
  });
  
  MetaHub.extend(Field, {
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
    
  var Text_Field = Field.sub_class('Field_Text', {
    block: 'text-field',
    initialize: function() {
      var seed = this.seed;
      var name = seed.name;
      
      var label = this.element.find('label');
      label.text(Field.pretty_name(name));
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
        
        Field.update_seed(seed, value);
      });
      
      this.input = input;
    },
    update_element: function(value) {
      this.input.val(value);
    }
  });
  
  var Editor = List.sub_class('Editor', {
    initialize: function() {
      if (this.seed)
        this.set_seed();       
    },
    create_control: function(seed, name, type) {
      var control = Text_Field.create({
        name: name,
        owner: seed,
        type: type
      });
      
      return control;
    },
    set_seed: function(seed, names) {      
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