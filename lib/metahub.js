
var MetaHub = (function () {
  'use strict';
 
  Object.has_properties = function(obj) {   
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) 
        return true;
    }
    return false;
  };
  
  Object.is_array = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }
  
  Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) size++;
    }
    return size;
  };

  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }

  var MetaHub = {
    extend: function(destination, source, names) {
      if (typeof source == 'object' || typeof source == 'function') {
        if (names == null)
          names = Object.getOwnPropertyNames(source);
      
        for (var k = 0; k < names.length; ++k) {
          var name = names[k];
          if (source.hasOwnProperty(name)) {
            var info = Object.getOwnPropertyDescriptor(source, name);
            Object.defineProperty(destination, name, info);

            // getter / setter
            if (info.get) {
              Object.defineProperty(destination, name, info);
            }
            // regular property
            else {
              if (source[name] === null)
                info.value = null;
              else if (Object.is_array(source[name]) && source[name].length == 0)
                info.value = [];
              else if (typeof source[name] == 'object' && !Object.has_properties(source[name]))
                info.value = {};
              //              else
              //                info.value = source[name];
              
              Object.defineProperty(destination, name, info);
            }
          }
        }
      }
      return destination;
    },
    guid: function () {
      return S4()+S4()+"-"+S4()+"-"+S4();
    }
  };
  
  MetaHub.current_module = MetaHub;

  
  MetaHub.extend_methods = function(destination, source) {
    if (typeof source == 'object' || typeof source == 'function') {
      for (var k in source) {
        if (source.hasOwnProperty(k) && typeof source[k] == 'function') {
          destination[k] = source[k];
        }
      }
    }
    return destination;
  }
    
  MetaHub.metanize = function(target) {
    if (target.is_meta_object)
      return target;
    
    MetaHub.extend(target, Meta_Object.properties);
    target.guid = MetaHub.guid();
    return target;
  }

  MetaHub.serialize = function(source){
    if(source.original_properties) {
      return JSON.stringify(source, source.original_properties);
    }
    else {
      return JSON.stringify(source);
    }
  };
      
  var Meta_Object = MetaHub.Meta_Object = {
    sub_class: function (name, data) {
      var result = {};      
    
      MetaHub.extend_methods(result, this);
      result.name = name;
      result.parent = this;          
      result.properties = data;
      MetaHub.current_module[name] = result;
    
      return result;
    },  
    initialize_properties: function(object) {
      if (this.parent)
        this.parent.initialize_properties(object)
    
      MetaHub.extend(object, this.properties);  
    },
    initialize_methods: function(object, args) {
      if (this.parent) {
        var result = this.parent.initialize_methods(object, args);
        if (result)
          args = result;
      }
      
      if (!this.other_parents) {
        for (var x in this.other_parents) {
          this.other_parents[x].initialize_methods(object, args);          
        }
      }
    
      if (this.properties.hasOwnProperty('initialize'))
        return this.properties.initialize.apply(object, args);  
    },  
    /*
     * ,  
    initialize_methods: function(object, child_method, args) {
      var this_method = null;
      if (this.properties.hasOwnProperty('initialize')) {
        this_method = function() {
          return this.properties.initialize.apply(object, args); 
        };        
      }
      
      if (this.parent) {
        var result = this.parent.initialize_methods(object, this_method, args);
        if (result)
          args = result;
      }
      
      child_method();
     */
    create: function() {
      var result = this.create_without_initializing();
      var parameters = Array.prototype.slice.call(arguments);
      this.initialize_methods(result, parameters);
      return result;
    },
    create_without_initializing: function() {
      var result = {};
      this.initialize_properties(result);
      result.type = this;
      result.guid = MetaHub.guid();
      return result;
    },
    merge: function(new_parent) {
      var self = this;
      var names = Object.getOwnPropertyNames(new_parent).filter(function(name) {
        self.hasOwnProperty(name);
      });
      
      MetaHub.extend(this.properties, new_parent.properties, names);
      if (!this.other_parents)
        this.other_parents = [];
      
      this.other_parents.push(new_parent);
    },
    get_instance_property: function(name) {
      if (this.properties.hasOwnProperty(name))
        return this.properties[name];
      else if (this.type)
        return this.type.get_instance_property(name);
      
      return null;
    },
    name: 'Meta_Object',
    parent: null,
    properties: {
      is_meta_object: true,
      events: {},
      connections: {},
      extend: function(source, names) {
        MetaHub.extend(this, source, names)
      },
      toString: function() {
        return this.type + ":" + this.guid;
      },
      listen: function(other, name, method) {
        if (other !== this) {
          if (other.is_meta_object) {      
            this.connect(other);
          }
        }
    
        if (other.events[name] == null)
          other.events[name] = [];
      
        other.events[name].push({
          method: method,
          listener: this
        });    
      },
      unlisten: function(other, name) {
        if (other.events[name] == null)
          return;
      
        var list = other.events[name];
        for (var i = list.length - 1; i >= 0; --i) {
          if (list[i].listener === this) {
            list.splice(i, 1);  
          }
        }
      
        if (list.length == 0) {
          delete other.events[name];
        }
      },
      invoke: function(name) {
        if (!this.events[name])
          return;
      
        var args = Array.prototype.slice.call(arguments);
        args.shift();  // Remove 'name' from arguments  
        this.events[name].forEach(function(info) {
          info.method.apply(info.listener, args);
        })
      },
      connect:function(other, type, other_type){
        if (other_type == undefined)
          other_type = type;

        if (this.connections[other]) {
          if (this.connections[other].type != type && type) { 
            this.connections[other].type = type;
       
            other.connect(this, other_type, type);        
            this.invoke('connect.' + type, other);            
          }
          
          return;
        }
      
        if (!other.is_meta_object)
          return;
      
        var connection = Meta_Connection.create(this, other, type);
        this.connections[other] = connection;
      
        other.connect(this, other_type, type);        
        this.invoke('connect.' + type, other);
      },
      disconnect: function(other){
        if (this.connections[other]) {
          var connection = this.connections[other];
          this.connections[other].disconnect();
          delete this.connections[other];
          if (connection.type == 'parent') {
            this.disconnect_all();
          }
        }      
      },
      link: function(other){    
        if (this.is_listening(other, 'change'))
          return;
   
        if (!other.is_meta_object)
          return;
        //        other = MetaHub.metanize(other);
      
        this.listen(other, 'change', function(value) {
          this.value = value;
        });
      },
      is_listening: function(other, name) {
        if (!other.is_meta_object)
          return false;
      
        for(var x in other.events[name]) {
          if (other.events[name][x].listener === this)
            return true;
        }
        return false;
      },
      disconnect_all: function(type) {
        if (type == undefined) {
          var names = Object.getOwnPropertyNames(this.connections);
          for (var x = 0; x < names.length; ++x) {
            this.disconnect(x);
          }      
          this.connections = {};
        }
        else{
          var connections = this.get_connections(type);
          for (var x in connections) {
            this.disconnect(connections[x]);
          }
        }
      },
      get_connections: function(type) {
        var result = [];
        for (var x in this.connections) {
          if(this.connections[x].type == type) {
            result.push(this.connections[x].other);
          }
        }
       
        return result;
      },
      get parent() {
        return this.get_connections('parent')[0];
      }
    }
  };
  
  var Meta_Connection = Meta_Object.sub_class('Meta_Connection', {
    other: null,
    parent: null,
    type: '',
    initialize: function(parent, other, type){
      this.parent = parent;
      this.other = other;
      this.type = type;
    },
    disconnect: function(){
      if (this.parent.connections[this.other]){
        delete this.parent.connections[this.other];
      }
      
      if (this.other_connection()){
        this.other_connection().disconnect();
      }
      
      this.parent = null;
      this.other = null;
    },
    other_connection: function(){
      return this.other.connections[this.parent];
    }
  });
  
  var Global = function() {
    return window;
  }
  MetaHub.Global = Global;
  
  MetaHub.import_all = function() {
    MetaHub.extend(Global(), MetaHub);
    delete Global().extend;
  }
  
  return MetaHub;
})();