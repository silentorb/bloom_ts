Bloom
Created by Christopher W. Johnson
Copyright (c) 2012 Silent Orb


Bloom is a lightweight javascript UI library built on top of jQuery.  It contains the following features:

* A class system through MetaHub
* A simple yet powerful event system
* Client-side templating
* Binding data to jQuery elements

MetaHub

The central unit of MetaHub is the Meta_Object class.  Meta_Object classes have two primary methods: subclass() to define classes, and create() to instantiate classes.

function subclass(string name, array properties)
The name argument is for internal use.  MetaHub maintains a hash of defined classes.  This can be useful for importing classes into other namespaces (i.e. JavaScript hacked namespaces.)

The properties argument is an array of variables and functions that compose the members of the Meta_Object.  This works similar to JavaScript's prototype system.

Example:

```javascript
var Monster = Meta_Object.subclass('Monster', {
health: 12,
race: 'unknown',
initialize: function(race) {
this.race = race;
},
eat: function(victim) {
this.health += victim.health;
victim.die();
}
});

var dragon = Monster.create('dragon');
```

If a Meta_Object has an initialize method, that method is called when the class is instantiated.  The base class initialize method is called first, followed by each child initialize method.



Bloom
