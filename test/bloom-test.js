Block.library['test_div'] = new Block('test_div', '<div></div>');
Block.library['test_list'] = new Block('test_list', '<ul></ul>');

var Test_Element = Element.sub_class('Test_Element', {
  block: 'test_div'
});

var Test_List = List.sub_class('Test_List', {
  block: 'test_list',
  remote_list: 'nodes',
  item_type: Meta_Object
});

$(function(){
     
  test("Element.initialize", function() {    
    var virtual_element = Element.create_without_initializing();
    Element.properties.initialize.apply(virtual_element, ['<div></div>']);
    ok(typeof virtual_element.element == 'object', "Element has element");

  });
  
  test("Element.render", function() {
    var virtual_element = Element.create_without_initializing();
    virtual_element.block = 'test_div';
    virtual_element.render();
    ok(typeof virtual_element.element === 'object', "control has element");
    var function_called = false;
    virtual_element.render(function (object) {
      ok(object.is_meta_object, "Render Onload passes a Meta_Object");   
      ok(object === virtual_element, "Render Onload passes the correct control");   
      function_called = true;
    });
    
    ok(function_called, "Element.render called the onload function that was passed to it");
  });

  test("Element.create", function() {
    var control;
      
    control = Test_Element.create();
    ok(typeof control.element === 'object', "Test_Element has element");
     
    var function_called = false;
    control = Test_Element.create(function() {
      function_called = true;
    });    
    ok(typeof control.element === 'object', "Test_Element has element");
    ok(function_called, "Element.render called the onload function that was passed to it");

    control = Element.create('<div></div>');    
    ok(typeof control.element === 'object', "Element has element");
  });
  
  test("List.on_update", function() {   
    var data = {
      nodes: []
    };
    data.nodes.push(Test.create_node());
    
    var function_called = false;
    Test_List.create(function(list){
      list.on_update(data);
      ok(list.children.length > 0, 'list has children')
      ok(list.element.length > 0, 'list has element')
      function_called = true;
    });

    ok(function_called, "List.create called the onload function that was passed to it");  
  });
});