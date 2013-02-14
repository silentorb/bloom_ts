
var Fixtures = {
  initialize_garden: function() {
    var garden = Garden.create();
    garden.attach_model(test_model);
    garden.app_path = 'dream';
    garden.initialize_irrigation();
    garden.irrigation.page_path = 'world';
    return garden;
  }
}

buster.testCase("Irrigation", {
  "Garden.get_path_array": function () {
    var result = Irrigation.get_path_array('home/item/action', 'home');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');

    var result = Irrigation.get_path_array('/home/item/action', 'home');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
    
    var result = Irrigation.get_path_array('home/item/action', '/home');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
    
    var result = Irrigation.get_path_array('item/action', '/');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
    
    var result = Irrigation.get_path_array('item/12', '/');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 12);
  },
  "test get_request": function() {
    //    var original_url = window.location.pathname;
    history.pushState({}, '', '/dream/world/door/12');
    assert.equals('/dream/world/door/12', location.pathname);
    var irrigation = Fixtures.initialize_garden().irrigation;
    var request = irrigation.get_request();
    assert.equals(request.path.length, 3);
    assert.equals(request.trellis, 'door');
    assert.equals(request.id, 12);
    
    history.pushState({}, '', '/dream/world/door/create');
    var request = irrigation.get_request();
    assert.equals(request.action, 'create');
    
    history.pushState({}, '', '/dream/world/door/12/delete');
    var request = irrigation.get_request();
    assert.equals(request.action, 'delete'); 
    assert.equals(request.id, 12);
  //    window.history.pushState('', '', original_url);
  }
});

buster.testCase("Seed", {
  setUp: function() {
    this.garden = Fixtures.initialize_garden();
  },
  "test_load_model": function() {
    assert.isObject(this.garden);
    assert.isObject(this.garden.vineyard);
    assert.isObject(this.garden.vineyard.trellises);
    assert.isObject(this.garden.vineyard.trellises['door']);
  },
  "test_get_url": function () {
    var seed = this.garden.vineyard.trellises['door'].create_seed();
    seed.data.id = 12;
    assert.equals(seed.get_url('page'), 'dream/world/door/12')
  }
});