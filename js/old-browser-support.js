/*
 *  Load this before MetaHub/Bloom for older browsers, particularly IE < 9
 */

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

if (!Array.prototype.forEach) {
  Array.prototype.forEach= function(action, that /*opt*/) {
    for (var i= 0, n= this.length; i<n; i++)
      if (i in this)
        action.call(that, this[i], i, this);
  };
}

if (typeof Object.create != 'function') {
  Object.create = function(prototype) {
    var constructor = function() {};
    constructor.prototype = prototype;
    return new constructor();
  }
}

if (Object.getOwnPropertyDescriptor) {
  try {
    Object.getOwnPropertyDescriptor({
      a:1
    }, 'a');
  }
  catch(ex) {
    Object.getOwnPropertyDescriptor = undefined;
  }
}