
var MetaHub = (function () {
  'use strict';
 
  var MetaHub = {};
  MetaHub.current_module = MetaHub;

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

  MetaHub.extend = function(destination, source, names) {
    if (typeof source == 'object' || typeof source == 'function') {
      if (names == null)
        names = Object.getOwnPropertyNames(source);
      //      for (var k in source) {
      for (var k = 0; k < names.length; ++k) {
        var name = names[k];
        if (source.hasOwnProperty(name)) {
          var info = Object.getOwnPropertyDescriptor(source, name);
          if (info.get)
            Object.defineProperty(destination, name, info);
          else {
            if (Object.is_array(source[name]) && source[name].length == 0)
              destination[name] = [];
            else if (typeof source[name] == 'object' && !Object.has_properties(source[name]))
              destination[name] = {};
            else
              destination[name] = source[name];
          }
        }
      }
    }
    return destination;
  }
  
  MetaHub.extend_methods = function(destination, source) {
    if (typeof source == 'object' || typeof source == 'function') {
      for (var k in source) {
        if (source.hasOwnProperty(k) && jQuery.isFunction(source[k])) {
          destination[k] = source[k];
        }
      }
    }
    return destination;
  }
    
  MetaHub.metanize = function(target) {
    if (target.is_meta_object)
      return target;
    
    if (typeof target == 'string') {  
      var val = target;
      target = new String(target);   
    }
    
    if (typeof target == 'number') {  
      var val = target;
      target = new Number(target);   
    }
    
    if (typeof target == 'object') {
      target.original_properties = Object.getOwnPropertyNames(target);
    }
    
    MetaHub.extend(target, Meta_Object.properties);
      
//    if (target.jquery) {
//      Object.defineProperty(target, 'value', {
//        get: function(){
//          return this.val();
//        },
//        set: function(value){
//          this.val(value);
//        }
//      });
//      
//      target.change(function () {        
//        target.invoke('change', target.val());
//      });
//      
//      target.relationships['element'] = 'source';
//    }
//    else if (val != null) {
//      target.internal_value = val;
//      Object.defineProperty(target, 'value', {
//        get: function(){
//          return this.internal_value;
//        },
//        set: function(value){
//          if (value != this.internal_value) {
//            this.internal_value = value;
//            this.invoke('change', this.internal_value);
//          }  
//        }
//      });      
//    }
    
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
    
      MetaHub.extend_methods(result, Meta_Object);
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
    
      if (this.properties.hasOwnProperty('initialize'))
        return this.properties.initialize.apply(object, args);  
    },  
    create: function() {
      var result = {};
      this.initialize_properties(result);
      result.type = this;
      var parameters = Array.prototype.slice.call(arguments);
      this.initialize_methods(result, parameters);

      return result;
    },  
    name: 'Meta_Object',
    parent: null,
    properties: {
      is_meta_object: true,
      extend: function(source, names) {
        MetaHub.extend(this, source, names)
      },
      events: {},
      relationships: {},
      listen: function(other, name, method) {
        if (other !== this) {
          if (!other.is_meta_object)
            return;
          //          other = MetaHub.metanize(other);
      
          this.connect(other);
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
      connections: {},
      value: null,
      connect:function(other, type, other_type){
        if (this.connections[other])
          return;
      
        if (!other.is_meta_object)
          return;
        //        other = MetaHub.metanize(other);  
      
        var connection = Meta_Connection.create(this, other, type);
        this.connections[other] = connection;
 
        if (other_type == null)
          other_type = type;
      
        other.connect(this, other_type, type);
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
      disconnect_all: function() {
        var names = Object.getOwnPropertyNames(this.connections);
        for (var x = 0; x < names.length; ++x) {
          this.disconnect(x);
        }      
        this.connections = {};
      },
      get_connections: function(name) {
        return this.connections.filter();
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