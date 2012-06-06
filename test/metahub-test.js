MetaHub.import_all(); 

var fired = false;

function fire() {
  fired = true;
}

function test_fire(target, event) {
  fired = false;
  var object = Meta_Object.create();
  object.listen(target, event, fire);
}

$(function(){
     
  test("MetaHub.extend", function() {    
    var common = {};
    var source = {
      nothing: null,
      common: common
    };
    
    var target = { };

    MetaHub.extend(target, source);
    equal(target.nothing, null, "target.nothing is null");
    notStrictEqual(source.common, target.common, "MetaHub.extend should clone property objects");    
  });
  
  test("MetaHub.connections", function() {    
    var parent = Meta_Object.create();
    var child = Meta_Object.create();

    parent.connect(child, 'child', 'parent');
    
    notEqual(parent.connections, null, "Parent should have a connection list.");    
    equal(Object.size(parent.connections), 1, "Parent should have one connection.");
    equal(parent.connections[child].type, 'child', 'Parent connection type should be "child"');
    equal(parent.get_connections('child').length, 1, "Parent should have one child.");
    
    test_fire(parent, 'disconnect.child');
    parent.disconnect(child);
    
    ok(fired, "disconnect.child was fired")
    equal(parent.get_connections('children').length, 0, 'Parent should have no more children');
    equal(child.parent(), null, "child should have no parent");
 
  });
  
  test("MetaHub.connections - Change type name", function() {    
    var first = Meta_Object.create();
    var second = Meta_Object.create();
    first.connect(second, 'first', 'second');
    first.connect(second, 'a', 'b');
    equal(first.connections[second].type, 'a', 'First connection was properly modified');
    equal(second.connections[first].type, 'b', 'Second connection was properly modified');
  });
    
  test("Metal_Object.create", function() {
    var finished = false;
    var Test_Object = Meta_Object.sub_class('Test_Object', {
      initialize: function(action) {
        this.__create_finished = action;
      }
    });
    
    Test_Object.create(function() {
      finished = true;
    });
    
    equal(finished, true, "Passed finished method was called.")
  });
});
