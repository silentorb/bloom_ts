Block.library['test_div'] = new Block('div', '<div></div>');

var Test_Element = Element.sub_class('Test_Element', {
  block: 'test_div'
});

$(function(){
     
  test("Element.properties.initialize", function() {    
    var virtual_element = Element.create_without_initializing();
    Element.properties.initialize.apply(virtual_element, ['<div></div>']);
    ok(typeof virtual_element.element == 'object', "Element has element");

  });
  
  test("Element.properties.render", function() {
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
    
    ok(function_called, "element.render called the onload function that was passed to it");
  });

  test("Element.properties.create", function() {
    var control = Test_Element.create();
    ok(typeof control.element === 'object', "Test_Element has element");
    
    var control = Element.create('<div></div>');    
    ok(typeof control.element === 'object', "Element has element");
  });  
});