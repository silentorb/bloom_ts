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
    },
    deep_clone: function(source) {
      return jQuery.extend(true, [], source);
    },
    deep_extend: function(target, source) {
      return jQuery.extend(true, target, source);
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
      var temp = {};
      MetaHub.extend(temp, source, source.original_properties);
      return JSON.stringify(temp);
    //return JSON.stringify(source, source.original_properties);
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
        type.properties.initialize.apply(object, args);        
        if (object.$pause) {
          return [];
        }        
      }  
 
      return types;
    },
    create: function() {
      var result = this.create_without_initializing();
      // IE < 9 doesn't seem to like the other way of overriding toString()
      result.toString = function() {
        return this.meta_source + ":" + this.guid;
      };
      var parameters = Array.prototype.slice.call(arguments);
      this.initialize_methods(result, [], parameters);
      
      if (result.__create_finished !== undefined) {
        if (typeof result.__create_finished == 'function') {
          result.__create_finished(result);
        }
        
        delete result.__create_finished;
      }
      
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
    change_parent: function(target, new_parent, type) {
      var parents = target.get_connections('parent');
      target.connect(new_parent, 'parent', type);
      for (var x = 0; x < parents.length; x++) {
        target.disconnect(parents[x]);
      }
    },
    connect_objects: function(first, other, type) {
      var connection = first.connection(other);
      if (connection) {
        if (connection.type != type && type) { 
          connection.type = type;
          return true;
        }
         
        return false;
      }
      
      connection = Meta_Connection.create(first, other, type);
      first.internal_connections.push(connection);
      return true;
    },
    disconnect_objects: function(first, other) {
      var connection = first.connection(other);
      if (connection) {
        var type = connection.type;
        first.internal_connections.splice(first.internal_connections.indexOf(connection), 1);
        
        for(var event in other.events) {
          first.unlisten(other, event);
        }
        
        connection.parent = null;
        connection.other = null;
      
        first.invoke('disconnect.' + type, other, first);
          
        if (!first.__disconnecting_everything && connection.type == 'parent' && first.get_connections('parent').length == 0) {
          first.disconnect_all();
        }          
      //          else if (Object.keys(first.internal_connections).length == 0) {
      //            first.disconnect_all();
      //          }
      }   
    },
    invoke_binding: function(source, owner, name) {
      if (!owner.events[name])
        return;
      
      var args = Array.prototype.slice.call(arguments, 3);
      var info = owner.events[name], length = info.length;
      for (var x = 0; x < length; ++x) {
        var binding = info[x];
        if (binding.listener !== source) {
          binding.method.apply(binding.listener, args);
        }
      }
    },
    override: function(name, new_property) {
      this.properties[name] = new_property;
      for (var x = 0; x < this.children.length; x++) {
        this.children[x].override(name, new_property);
      }
    },
    value: function(name, value, source) {
      if (value == undefined || value === this[name])
        return this[name];
      
      this[name] = value;
      Meta_Object.invoke_binding(source, this, 'change.' + name, value);
      Meta_Object.invoke_binding(source, this, 'change', name, value);
      return value;
    },
    properties: {
      is_meta_object: true,
      events: {},
      internal_connections: [],
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
      
        var args = Array.prototype.slice.call(arguments, 1);
        var info = this.events[name];
        for (var x = 0; x < info.length; ++ x) {          
          info[x].method.apply(info[x].listener, args);
        }
      },
      gather: function(name) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (!this.events[name])
          return args[0];
      
        var info = this.events[name];
        for (var x = 0; x < info.length; ++ x) {          
          args[0] = info[x].method.apply(info[x].listener, args);
        }        
        return args[0];
      },
      connect:function(other, type, other_type){
        if (other_type == undefined)
          other_type = type;

        if (!other.is_meta_object)
          return;

        // The process_connect function can be added to a Meta_Object
        // to intercept potential connections
        if (typeof this.process_connect == 'function') {
          if (this.process_connect(other, type, other_type) === false) {
            return;
          }
          else if (typeof other.process_connect == 'function') {
            if (other.process_connect(this, other_type, type) === false) {
              return;
            }
          }
        }
        
        if (!Meta_Object.connect_objects(this, other, type, other_type)) {
          return;
        }
        
        Meta_Object.connect_objects(other, this, other_type, type);        

        this.invoke('connect.' + type, other, this);
        other.invoke('connect.' + other_type, this, other);
      },
      disconnect: function(other){
        Meta_Object.disconnect_objects(this, other);
        Meta_Object.disconnect_objects(other, this);
      },
      disconnect_all: function(type) {        
        if (type == undefined) {
          // This is set to prevent repeated calls to disconnect_all.
          this.__disconnecting_everything = true;
          for (var x = this.internal_connections.length - 1; x >= 0; --x) {            
            this.disconnect(this.internal_connections[x].other);
          }
          this.internal_connections = [];
          this.invoke('disconnect-all', this);
        }
        else{
          var connections = this.get_connections(type);
          for (var x = connections.length - 1; x >= 0; --x) {
            this.disconnect(connections[x]);
          }
        }
        
        delete this.__disconnecting_everything;
      },
      connection: function(other) {
        for (var x = 0; x < this.internal_connections.length; x++) {
          if (this.internal_connections[x].other === other) {
            return this.internal_connections[x];
          }
        }

        return undefined;
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
      // This function is long and complicated because it is a heavy hitter both in usefulness
      // and performance cost.
      get_connections: function() {
        var x, filters = Array.prototype.slice.call(arguments);
        var first_filter = filters.shift();

        var result = [];
        if (typeof first_filter == 'string') {          
          for (x = 0; x < this.internal_connections.length; x++) {          
            if (this.internal_connections[x].type == first_filter) {
              result.push(this.internal_connections[x].other);
            }
          }
        }
        else if (typeof first_filter == 'function') {
          for (x = 0; x < this.internal_connections.length; x++) {
            if (first_filter(this.internal_connections[x].other)) {
              result.push(this.internal_connections[x].other);
            }
          }
        }
        
        for (var f = 0; f < filters.length; f++) {
          var filter = filters[f];
          
          if (typeof filter == 'string') {
            for (var x = result.length - 1; x >= 0; x--) {
              if (this.internal_connections[result[x]].type != filter) {
                result.splice(x, 1);
              }
            }           
          }
          else if (typeof filter == 'function') {
            for (var x = result.length - 1; x >= 0; x--) {
              if (!filter(result[x])) {
                result.splice(x, 1);
              }
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
      
        this[property_name] = function(filter) {
          return this.get_connections(connection_name, filter);
        };
          
      //        Object.defineProperty(this, property_name, {
      //          get: function() {
      //            return this.get_connections(connection_name);
      //          }
      //        });
      },
      optimize_getter: function(property_name, connection_name) {    
        var array = [];
        this[property_name] = array;
          
        this.listen(this, 'connect.' + connection_name, function(item) {
          array.push(item);
        });
          
        this.listen(this, 'disconnect.' + connection_name, function(item) {
          array.splice(array.indexOf(item), 1);
        });
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
    }
  //    ,
  //    disconnect: function() {
  //      if (this.parent.internal_connections[this.other]) {
  //        if (this.parent)
  //          delete this.parent.internal_connections[this.other];
  //      }
  //      
  //      if (this.other_connection()){
  //        var other = this.other;
  //        var parent = this.parent;
  //        this.parent = null;
  //        this.other = null;
  //        other.disconnect(parent);
  //      }
  //      else {
  //        this.parent = null;
  //        this.other = null;
  //      }
  //    },    
  //    other_connection: function() {
  //      if (!this.other)
  //        return null;
  //      
  //      return this.other.internal_connections[this.parent];
  //    }
  };
  
  var Meta_Value = Meta_Object.sub_class('Meta_Value', {
    initialize: function(value) {
      this.internal_value = value;
    }
  });
  
  try {
    Object.defineProperty(Meta_Value.properties, "value", {
      get: function() {
        return this.internal_value;
      },
      set: function(value) {
      
        if (typeof this.constrain == 'function') {
          value = this.constrain(value);
        }
    
        if (value != this.internal_value) {
          this.internal_value = value;
          this.invoke('change', value);
        }
      }    
    });
  }
  catch (exception) {    
  }
  
  MetaHub.Meta_Value = Meta_Value;
  
  var Global = window;  
  MetaHub.Global = Global;

  MetaHub.import_members = [ 'Meta_Object', 'Meta_Connection', 'Meta_Value' ];
  
  MetaHub.import_all = function() {
    MetaHub.extend(Global, MetaHub, MetaHub.import_members);
  }
  
  return MetaHub;
})();