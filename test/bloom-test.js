Bloom.import_all();

Block.library['test_div'] = new Block('test_div', '<div></div>');
Block.library['test_list'] = new Block('test_list', '<ul></ul>');

var Test_Flower = Flower.sub_class('Test_Flower', {
  block: 'test_div'
});

var Test_List = List.sub_class('Test_List', {
  block: 'test_list',
  item_type: Test_Flower,
  seed_name: 'nodes'
});

var Test = {
  create_node: function() {
    var node = {
      nid: 1,
      title: 'Test Node',
      uid: 1    
    };      
    MetaHub.metanize(node);
    return node;
  }
};

$(function(){
     
  test("Flower.initialize", function() {    
    var virtual_element = Flower.create_without_initializing();
    Flower.properties.initialize.apply(virtual_element, ['<div></div>']);
    ok(typeof virtual_element.element == 'object', "Flower has element");

  });
  
  test("Flower.render", function() {
    var virtual_element = Flower.create_without_initializing();
    virtual_element.block = 'test_div';
    virtual_element.render();
    ok(typeof virtual_element.element === 'object', "control has element");
    var function_called = false;
    virtual_element.render(function (object) {
      ok(object.is_meta_object, "Render Onload passes a Meta_Object");   
      ok(object === virtual_element, "Render Onload passes the correct control");   
      function_called = true;
    });
    
    ok(function_called, "Flower.render called the onload function that was passed to it");
  });

  test("Flower.create", function() {
    var control;
      
    control = Test_Flower.create();
    ok(typeof control.element === 'object', "Test_Flower has element");
     
    var function_called = false;
    control = Test_Flower.create(function() {
      function_called = true;
    });    
    ok(typeof control.element === 'object', "Test_Flower has element");
    ok(function_called, "Flower.render called the onload function that was passed to it");

    control = Flower.create('<div></div>');    
    ok(typeof control.element === 'object', "Flower has element");
  });
    
  test("List.on_update", function() {   
    var seed = {
      nodes: []
    };
    seed.nodes.push(Test.create_node());
    
    var function_called = false;
    Test_List.create(function(list){
      list.on_update(seed.nodes);
      ok(list.children.length > 0, 'list has children')
      ok(list.element.length > 0, 'list has element')
      function_called = true;
    });

    ok(function_called, "List.create called the onload function that was passed to it");  
  });
  
});