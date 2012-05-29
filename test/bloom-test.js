Bloom.import_all();

Block.source_path = 'resources';
Block.library['test_div'] = new Block('test_div', '<div></div>');
Block.library['test_list'] = new Block('test_list', '<ul></ul>');

var fired = false;

function fire() {
  fired = true;
}

function test_fire(target, event) {
  fired = false;
  var object = Meta_Object.create();
  object.listen(target, event, fire);
}

var Test_Flower = Flower.sub_class('Test_Flower', {
  block: 'test_div',
  data_process: function(object){ 
    object.processed = true; 
    return object;
  }
});

var Bind_Flower = Flower.sub_class('Bind_Flower', {
  block: 'bind',
  flower_property: 'fp',
  flower_function: function() {
    return 'ff';
  }
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

function _Block() {

  test("Block.load", function() {
    equal(Block.library['div'], undefined, "div block is undefined.");
    stop();
    Block.load('div', function(block) {
      ok(block.html.length > 0, "block.html has content.");
      start();
    });   
  });
  
/*
  test("Block.load_many", function() {
    var names = [
    'load_many1',
    'load_many2',
    'does_not_exist'
    ];
    var count = Object.size(Block.library);
  
    stop();
    Block.load_many(names, function() {
      equal(Object.size(Block.library), count + 2, 'Two blocks were added');
      var sample = $(Block.library['load_many2'].html)
      equal(sample.length, 1, 'html has one root element');
      sample = sample.find('.lily');
      equal(sample.length, 1, 'html was loaded properly');
      start();
    });
  });
   */
}

function _Flower() {
       
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
  
  Block.load('bind', function() {
    test("Flower.source_to_element", function() {
      var flower = Bind_Flower.create_without_initializing();
      flower.seed = {
        seed_property: 'sp',
        seed_function: function() {
          return 'sf';
        }
      }
    
      flower.render2();
      equal(flower.element.length, 1, 'flower.element is not empty.');
      flower.source_to_element();
      var children = flower.element.children();
      equal($(children[0]).text(), 'sp', 'Binding to seed property.');
      equal($(children[1]).text(), 'sf', 'Binding to seed function.');
      equal($(children[2]).text(), 'fp', 'Binding to flower property.');
      equal($(children[3]).text(), 'ff', 'Binding to flower function.');
    });
  });

}

function _List() {  
  test("List.on_update", function() {   
    var seed = {
      nodes: []
    };
    seed.nodes.push(Test.create_node());
    
    var function_called = false;
    Test_List.create(function(list){
      list.on_update(seed.nodes);
      ok(list.children().length > 0, 'list has children');
      ok(list.element.length > 0, 'list has element');  
      equal(list.children()[0].type, Test_Flower, "child type is Test_Flower");
      equal(list.children()[0].seed.processed, true, "data_processed was called");
      function_called = true;
    });
    
    ok(function_called, "List.create called the onload function that was passed to it");  

  });
  
  test("List - Meta_Object.change_parent", function() {         
    var a = Test_List.create();
    var b = Test_List.create();
    var iris = Flower.create('<div>iris</div>');
    a.connect(iris, 'child', 'parent');

    Meta_Object.change_parent(iris, b, 'child');
    
    var b_children = b.element.find('li *');
    equal(b_children.length, 1, "B's element has one child.");
  });

  test("List - seed reflection", function() {
    var seeds = Meta_Object.create();
    var list = Test_List.create(seeds);
    list.watch_seed();
    var seed = Meta_Object.create();
    seeds.connect(seed, 'child', 'parent');
    equal(list.children().length, 1, "The list has one child");
    equal(list.element.children().length, 1, "The list element has one child");
    test_fire(seeds, 'disconnect.child');
    var flower = seed.get_connection('flower');
    seeds.disconnect(seed);
    
    ok(fired, "disconnect.child was fired");
    equal(list.children().length, 0, "The list has no children");
    equal(list.element.children().length, 0, "The list element has no children");
    // In case that doesn't work, try directly removing it to see if remove_element is even getting called.
    list.remove_element(flower);
    
    equal(list.element.children().length, 0, "The list element has no children");
    equal(flower.element.parent().length, 0, "The item element has no parent");
  });
}

$(function(){
  QUnit.config.testTimeout = 5000;
  _Block();
  _Flower();
  _List();
  
});