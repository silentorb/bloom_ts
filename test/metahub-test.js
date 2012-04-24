MetaHub.import_all(); 

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
  });
});
