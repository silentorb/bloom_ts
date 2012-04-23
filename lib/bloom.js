/*
 * Bloom v1.1.0
 * Javascript UI Library
 * Christopher W. Johnson
 * Copyright 2012 Silent Orb
 */

var Bloom = (function () {
  'use strict';
  var Bloom = {};
  
  MetaHub.import_all(); 
  MetaHub.current_module = Bloom;
  
  // The main purpose of this wrapper is to have an easy
  // entry point for redirecting ajax during unit testing.
  Bloom.get = function (url, action) {
    jQuery.get(url, action, 'json');
  };
    
  function Block(name, html) {
    this.name = name;
    Block.library[name] = this;
    if (html != null)
      this.html = html;
  }
  Bloom.Block = Block;
  
  Block.library = {}
  Block.default_extension = '.html';
  Block.source_path = "";
  
  Block.load = function (name, onload) {
    var block = Block.library[name];
    
    if (block) {
      if (typeof onload == 'function')
        onload(block);
      return block;
    }
    
    block = new Block(name);
    jQuery.get(Block.source_path + "/" + name + Block.default_extension, function(seed) {
      block.html = seed;
      if (typeof onload == 'function')
        onload(block);      
    });
    
    return block;
  }
  
  Block.generate = function(name, seed) {
    return Block.library[name].generate(seed);
  }
  
  Block.generate_query = function(name, seed) {
    return Block.library[name].generate(seed);
  }
   
  Block.prototype = {
    constructor: Block,
    name: '',
    html: '', 

    generate: function(control) {
      var output = this.html;
      
      output = output.replace(/@{([\W\w]*?)}(?=\s*(?:<|"))/gm, function(all, code) {
        var result = eval(code);
        if (typeof result === "undefined" || result == null)
          return '';
      
        return result;
      });
      
      var result = $(output);
      return result;
    }
  }
  
  var Flower = Meta_Object.sub_class('Flower', {
    data_process: null,
    initialize: function(seed, onload) {
      if (onload == null) {
        if (typeof seed == 'function') {
          onload = seed;
          seed = null;
        }
      }
      
      // Block Mode
      if (this.block) {       
        if (typeof seed == 'object') {
          if (typeof this.data_process == 'function')
            this.seed = this.data_process(seed);
          else
            this.seed = seed;
        }
        this.render(onload);
      } // Wrapper Mode
      else {              
        if (seed != null) {        
          if (seed.hasOwnProperty('jquery'))
            this.element = seed;  
          else
            this.element = jQuery(seed);    
        }
      }
    },
    render: function(onload) {
      var self = this;
      
      Block.load(this.block, function(block) {
        self.element = block.generate(self);
        self.source_to_element();
        if (typeof onload == 'function')
          onload(self);        
      });
    },
    bind: function(event, method) {
      var self = this;
      
      this.element.bind(event, function() {
        method.apply(self, arguments);
      })
    },
    bind_child: function(query, event, method) {
      var self = this;
      this.element.find(query).bind(event, function() {
        method.apply(self, arguments);
      })
    },
    get_data: function() {
      var args = Array.prototype.slice.call(arguments);
      var method = args.pop();
      jQuery.get(args, function() {
        var args = Array.prototype.slice.call(arguments);
        args.push('json');
        method.apply(this, args);
      });
    },
    post_data: function() {
      var args = Array.prototype.slice.call(arguments);
      var method = args.pop();
      jQuery.get(args, function() {
        var args = Array.prototype.slice.call(arguments);
        args.push('json');
        method.apply(this, args);
      });
    },
    source_to_element: function(){            
      var value;
      
      for (var name in this.type.properties) {
        var element = this.element.find('*[bind=' + name + ']').first();
        if (element.length == 1) {
          var property = this[name];
          if (typeof property == 'function') {
            value = property.apply(this);
          }               
          else {
            value = property; 
          }
          if (element.is_input())
            element.val(value);
          else
            element.html(value);
        }
      }      
      
      for (var name in this.seed) {
        var element = this.element.find('#' + name + ', .' + name + ', [bind=' + name + ']').first();
        if (element.length == 1) {
          var property = this.seed[name];
          if (typeof property == 'function') {
            value = property.apply(this.seed);
          }               
          else {
            value = property; 
          }
          if (element.is_input())
            element.val(value);
          else
            element.html(value);
        }
      }      
    },
    element_to_source: function(){            
      for (var name in this.seed) {
        var element = this.element.find('#' + name + ', .' + name + ', [bind=' + name + ']').first();
        if (element.length == 1) {          
          if (typeof this.seed[name] != 'function' && element.is_input()) {
            this.seed[name] = element.val();
          }          
        }
      }      
    },
    update: function() {    
      var self = this;
      Bloom.get(this.query(), function(response) {
        self.invoke('update', response[self.seed_name]);     
      });
    },
    // Returns a url string to the service from which this object receives its data.
    query: function() {},
    // Name of the property of the query response that contains the actual object data.
    seed_name: 'seed'
  });
    
  jQuery.fn.is_input = function() {
    if (this.length == 0)
      return false;
    var name = this[0].nodeName.toLowerCase();
    return name == 'input' || name == 'select' || name == 'textarea';
  }

  var Node = Flower.sub_class('Node', {
    initialize: function() {
      this.nid = this.element.attr('nid');
      this.type = this.element.attr('type');    
    }
  });
  
  new Block('list', '<ul></ul>');
  
  var List = Flower.sub_class('List', {
    item_type: null,
    initialize: function(){
      this.listen(this, 'update', this.on_update);
    },
    on_update: function(seed){
      var self = this;
           
      if (this.item_type) {
        Block.load(this.item_type.get_instance_property('block'), function() {
          for (var x = 0; x < seed.length; ++x) {
            self.add(self.load_item(seed[x]));
          }          
          self.invoke('updated');
        });
      }
    },
    load_item: function(seed) {
      return this.item_type.create(seed);
    },
    add_button: function(html, click) {
      var row = $('<li>' + html + '</li>');
      this.element.append(row); 
      if (click)
        row.find('a').click(click);
    },
    empty: function() {
      this.disconnect_all('item');
      this.element.empty();
    },
    add: function(item) {
      var line;
      if (item.element[0].nodeName.toLowerCase() == 'li') {
        line = item.element;
      }
      else {
        line = jQuery('<li></li>');
        line.append(item.element);
      }
      this.element.append(line);
      this.connect(item, 'item', 'parent');      
      return item;
    },
    remove: function(item) {
      item.element.detach();
      this.disconnect(item);    
    }
  });
  
  var Dialog = Flower.sub_class('Dialog', {
    active: false,
    width: 340,
    height: 500,
    title: 'Dialog',
    modal: true,
    initialize: function() {
      var self = this;
            
      this.element.find('input[type=button]').click(function(e){
        e.preventDefault();        
        var button = $(this);
        var action;
        if (button.attr('action'))
          action = button.attr('action');
        else
          action = button.val().toLowerCase();
        
        self.invoke(action);
      });
      
      this.listen(this, 'submit', function(){
        self.element_to_source();

        if (self.seed.is_meta_object)
          self.seed.invoke('change');
        
        self.close();
      });
            
      this.listen(this, 'update', function(seed) {                     
        if (!self.active) {
          self.show();
          
          $(window).keydown(function(event) {
            if (event.keyCode == 13) {
              event.preventDefault();
              return false;
            }
          });
          self.active = true;
        }    
      });
    },
    show: function() {
      if (!this.modal)
        return;
            
      var self = this;
      if (this.element.parent().length == 0)
        jQuery('body').append(this.element);
      
      this.dialog = this.element.dialog({
        title: this.title,
        width: this.width,
        height: this.height,
        modal: true,
        close: function() {
          self.element.remove();
          // This is going to cause problems down the line and should eventually be done differently.
          $(window).unbind();
          self.invoke('close');
        }     
      });
    },
    close: function(){
      if (this.modal)
        this.dialog.dialog('close');        
    },
    query: function() {}
  
  });
  
  var Paged_Dialog = Dialog.sub_class('Paged_Dialog', {
    page: 0,
    rows:10,
    page_size: 5,
    text_filter: '',
    block: 'paged-list',
    initialize: function() {
      var self = this;
      this.list = List.create(this.element.find('ul'));
      
      this.listen(this, 'update', function(seed){
        this.list.empty();
        for (var c in seed[this.list_property]) {
          var item = this.create_item(seed[this.list_property][c]);
          this.list.add(item);
        }        
      });
      
      this.listen(this, 'prev', function() {
        if (self.page > 0) {
          --self.page;
          self.update();
        }        
      });
      
      this.listen(this, 'next', function() {
        if (self.page < Math.round(self.rows / self.page_size)) {
          ++self.page;
          self.update();
        }        
      });    
      
      this.element.find('.filter').change(function() {
        self.text_filter = $(this).val();
        self.update();
      });
      
      this.element.find('.filter').keyup(function(e) {
        if (e.keyCode == 13) {
          e.preventDefault();
          self.text_filter = $(this).val();
          self.update();     
        }
      });    
      
      this.listen(this, 'update', function(seed) {
        this.rows = seed.total;
      });
    }
  });
  
  var Confirmation_Dialog = Dialog.sub_class('Confirmation_Dialog', {
    block: 'confirmation',
    height: 200,
    initialize: function(){

    }
  });
  
  function Form(block_id) {
    return Block.library[block_id].html;
    //  return Block.generate(block_id);
  }
  Bloom.Form = Form;
  
  Form.radio = function(name, options, value) {
    var text = '<select name="' + name + '">';
    for(var key in options) {
      text += '<option ';
      if (key == value)
        text += 'selected="selected" ';
      text += 'value="' + key + '">' + options[key] + '</option>';
    }
    text += '</select>';
    return text;
  }
  
  var System = { 
    send_message: function() {},
    send_messages: function(response) {
      if (response.message) {
        System.send_message(response.message);
      }
      if (response.messages) {
        var message = '';
        for(var index in response.messages) {
          message += response.messages[index][0] + '<br/>';
        }
        
        System.send_message(message);
      }
    },
    post: function(url, seed, method) {
      if (!method) {
        method = seed;
        seed = null;
      }
      
      jQuery.post(url, seed, function(response) {
        if (!response.result) {
          System.send_message('There was a problem communicating with the server.');
          return;
        }
        if (response.result.toLowerCase() == 'success') {
          if (method)
            method(response);
        }      
        
        System.send_messages(response);
      });
    
    }
  }
  Bloom.System = System;
  
  // I want to keep Bloom open for working in systems outside of the browser, just in case.
  // As a rule of thumb, use Global() to refer to global variables, and
  // use window to refer to window specific members.
  
  Bloom.import_all = function() {
    MetaHub.extend(Global(), Bloom);
    delete Global().extend;
  }
  
  return Bloom;
})();
