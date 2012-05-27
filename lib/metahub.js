var MetaHub = (function () {
  'use strict';
  
  // Don't overwrite an existing implementation
  if (typeof Object.getOwnPropertyNames !== "function") {
    Object.getOwnPropertyNames = function (obj) {
      var keys = [];

      // Only iterate the keys if we were given an object, and
      // a special check for null, as typeof null == "object"
      if (typeof obj === "object" && obj !== null) {    
        // Use a standard for in loop
        for (var x in obj) {
          // A for in will iterate over members on the prototype
          // chain as well, but Object.getOwnPropertyNames returns
          // only those directly on the object, so use hasOwnProperty.
          if (obj.hasOwnProperty(x)) {
            keys.push(x);
          }
        }
      }

      return keys;
    }
  }

  if (!Array.prototype.indexOf) {  
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {  
      "use strict";  
      if (this == null) {  
        throw new TypeError();  
      }  
      var t = Object(this);  
      var len = t.length >>> 0;  
      if (len === 0) {  
        return -1;  
      }  
      var n = 0;  
      if (arguments.length > 0) {  
        n = Number(arguments[1]);  
        if (n != n) { // shortcut for verifying if it's NaN  
          n = 0;  
        } else if (n != 0 && n != Infinity && n != -Infinity) {  
          n = (n > 0 || -1) * Math.floor(Math.abs(n));  
        }  
      }  
      if (n >= len) {  
        return -1;  
      }  
      var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);  
      for (; k < len; k++) {  
        if (k in t && t[k] === searchElement) {  
          return k;  
        }  
      }  
      return -1;  
    }  
  }  
  
  if (!window.console) {
    window.console = {
      log: function(){}
    };    
  }
  
  if (!Array.prototype.forEach) {
    Array.prototype.forEach= function(action, that /*opt*/) {
      for (var i= 0, n= this.length; i<n; i++)
        if (i in this)
          action.call(that, this[i], i, this);
    };
  }

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
      var info;
      
      if (typeof source == 'object' || typeof source == 'function') {
        if (names == null)
          names = Object.getOwnPropertyNames(source);
      
        for (var k = 0; k < names.length; ++k) {
          var name = names[k];
          if (source.hasOwnProperty(name)) {
            if (!window.SUPPORT_BAD_IE) {
              info = Object.getOwnPropertyDescriptor(source, name);
                            
              //              getter / setter
              if (info.get) {
                Object.defineProperty(destination, name, info);
                continue;
              }
            }
            
            if (source[name] === null)
              destination[name] = null;
            else if (Object.is_array(source[name]) && source[name].length == 0)
              destination[name] = [];
            else if (typeof source[name] == 'object' && !Object.has_properties(source[name]))
              destination[name] = {};
            else
              destination[name] = source[name];
          //              else
          //                info.value = source[name];
              
          //              Object.defineProperty(destination, name, info);
          //            }
          }
        }
      }
      return destination;
    },
    guid: function () {
      return S4()+S4()+"-"+S4()+"-"+S4();
    },
    clone: function(source) {
      var result = {};
      MetaHub.extend(result, source);
      return result;
    }
  };
  
  MetaHub.current_module = MetaHub;
  
  MetaHub.get_internet_explorer_version = function() {
    var version = -1; // Return value assumes failure.
    if (navigator.appName == 'Microsoft Internet Explorer') {
      var ua = navigator.userAgent;
      var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
      if (re.exec(ua) != null)
        version = parseFloat(RegExp.$1);
    }
    return version;
  };
  
  MetaHub.is_bad_ie = function() {
    var version = MetaHub.get_internet_explorer_version();
    return version > 1 && version < 9;
  }
  
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
    
    target.original_properties = Object.getOwnPropertyNames(target);
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
    name: 'Meta_Object',
    parent: null,
    children: [],
    sub_class: function (name, data) {
      var result = {};      
    
      MetaHub.extend_methods(result, this);
      result.name = name;
      result.parent = this;
      this.children.push(result);
      result.children = [];
      result.properties = data;
      MetaHub.current_module[name] = result;
    
      return result;
    },  
    initialize_properties: function(object) {
      if (this.parent)
        this.parent.initialize_properties(object)
    
      MetaHub.extend(object, this.properties);  
    },
    initialize_methods: function(object, types, args) {      
      if (this.properties.hasOwnProperty('initialize')) {
        types.push(this);
      }
      
      if (this.parent) {
        types = this.parent.initialize_methods(object, types, args);        
      }
      
      return this.initialize_queue(object, types, args);   
    },  
    initialize_queue: function (object, types, args) {
      var temp = types.slice(0);
      for (var x = types.length; x > 0; x--) {
        if (types.length == 0)
          return [];
        
        var type = types.pop();
        object.__types = types;
        object.__args = args;
        type.properties.initialize.apply(object, args);        
        if (object.$pause) {
          return [];
        }        
      }  
      
      //      delete object.__types;
      //      delete object.__args;
 
      return types;
    },
    pause_initialization: function(object){
      object.$pause = true;
    },
    resume_initialization: function(object){
      delete object.$pause;
      if (object.__types == null) {
        return;
      }
      this.initialize_queue(object, object.__types, object.__args);
    },
    create: function() {
      var result = this.create_without_initializing();
      // IE < 9 doesn't seem to like the other way of overriding toString()
      result.toString = function() {
        return this.meta_source + ":" + this.guid;
      };
      var parameters = Array.prototype.slice.call(arguments);
      this.initialize_methods(result, [], parameters);
      return result;
    },
    create_without_initializing: function() {
      var result = {};
      this.initialize_properties(result);
      result.type = this;
      result.meta_source = this;
      result.guid = MetaHub.guid();
      return result;
    },
    get_instance_property: function(name) {
      if (this.properties.hasOwnProperty(name))
        return this.properties[name];
      else if (this.type)
        return this.type.get_instance_property(name);
      
      return null;
    },
    override: function(name, new_property) {
      this.properties[name] = new_property;
      for (var x = 0; x < this.children.length; x++) {
        this.children[x].override(name, new_property);
      }
    },
    properties: {
      is_meta_object: true,
      events: {},
      connections: {},
      extend: function(source, names) {
        MetaHub.extend(this, source, names)
      },
      toString: function() {
        return this.meta_source + ":" + this.guid;
      },
      listen: function(other, name, method) {
        if (other !== this) {
          if (!other.is_meta_object) {      
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
        var info = this.events[name];
        for (var x = 0; x < info.length; ++ x) {          
          info[x].method.apply(info[x].listener, args);
        }
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
        this.invoke('connect.' + type, other, this);
      },
      disconnect: function(other){
        if (this.connections[other]) {
          var connection = this.connections[other];
          var type = this.connections[other].type;
          this.connections[other].disconnect();
          delete this.connections[other];
          if (connection.type == 'parent') {
            this.disconnect_all();
          }
        }      
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
            this.disconnect(names[x]);
          }
          this.connections = {};
        }
        else{
          var connections = this.get_connections(type);
          for (var x in connections) {
            this.disconnect(connections[x]);
          }
        }
        
        this.invoke('disconnect_all', this);
      },      
      get_connections: function(filter) {
        var result = [];
        if (typeof filter == 'string') {
          for (var x in this.connections) {
            if (this.connections[x].type == filter) {
              result.push(this.connections[x].other);
            }
          }
        }
        else if (typeof filter == 'function') {
          for (var x in this.connections) {
            if (filter(this.connections[x].type)) {
              result.push(this.connections[x].other);
            }
          }
        }
        return result;
      },
      get_connection: function(filter) {
        return this.get_connections(filter)[0];
      },
      define_connection_getter: function(property_name, connection_name) {        
        //        if (this.hasOwnProperty(property_name)) {
        //          delete this[property_name];
        //        }
      
        this[property_name] = function() {
          return this.get_connections(connection_name);
        };
          
      //        Object.defineProperty(this, property_name, {
      //          get: function() {
      //            return this.get_connections(connection_name);
      //          }
      //        });
      },
      parent: function() {
        return this.get_connections('parent')[0];
      }
    }
  };
  
  var Meta_Connection = {
    other: null,
    parent: null,
    type: '',
    create: function(parent, other, type){
      var result = MetaHub.clone(Meta_Connection);
      result.parent = parent;
      result.other = other;
      result.type = type;
      return result;
    },
    disconnect: function(){
      if (this.parent.connections[this.other]){
        this.parent.invoke('disconnect.' + this.type, this.other, this.parent);
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
  };
  
  var Meta_Value = Meta_Object.sub_class('Meta_Value', {
    initialize: function(value) {
      this.internal_value = value;
    }
  });
  
  Object.defineProperty(Meta_Value.properties, "value", {
    get: function() {
      return this.internal_value;
    },
    set: function(value) {
      if (value > this.level)
        value = this.level;
    
      if (value != this.internal_value) {
        this.internal_value = value;
        this.invoke('change', value);
      }
    }
  });
  
  MetaHub.Meta_Value = Meta_Value;
  
  var Global = window;  
  MetaHub.Global = Global;

  MetaHub.import_members = [ 'Meta_Object', 'Meta_Connection' ];
  
  MetaHub.import_all = function() {
    MetaHub.extend(Global, MetaHub, MetaHub.import_members);
  }
  
  return MetaHub;
})();