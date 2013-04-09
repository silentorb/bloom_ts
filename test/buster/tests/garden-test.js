
var Fixtures = {
  create_garden: function() {
    var garden = Garden.create();
    garden.attach_model(test_model);
    garden.app_path = 'dream';
    garden.initialize_irrigation();
    garden.irrigation.page_path = 'world';
    return garden;
  }
}

new Block('simple-div', '<div></div>');
Fixtures.Test_Plot = Plot.subclass('Test_Plot', {
  block: 'simple-div'
});

buster.testCase("Irrigation", {
  "Garden.get_path_array": function() {
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
  "get_plot": function() {
    var irrigation = Fixtures.create_garden().irrigation;
    irrigation.trellis_plots.warrior = Fixtures.Test_Plot;
    var plot_type = irrigation.get_plot('warrior');
    assert(plot_type);
    assert.same(plot_type.name, 'Test_Plot');
  },
  "get_request": function() {
    //    var original_url = window.location.pathname;
    history.pushState({}, '', '/dream/world/door/12');
    assert.equals('/dream/world/door/12', location.pathname);
    var irrigation = Fixtures.create_garden().irrigation;
    var request = irrigation.get_request();
    assert.equals(request.path.length, 2);
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
  },
  "compare": function() {
    assert(Irrigation.compare('hello/frog', 'hello/frog'));
    assert(Irrigation.compare('hello/frog', 'hello/*'));
    assert(Irrigation.compare('hello/frog', ['hello', 'frog']));
    assert(Irrigation.compare(['*', 'frog'], ['hello', 'frog']));    
    refute(Irrigation.compare(['*', 'frog'], 'b/c'));
    refute(Irrigation.compare('hello/frog', ['hello', 'frog', '2']));    
  }
});

buster.testCase("Garden", {
  setUp: function() {
    this.garden = Fixtures.create_garden();
    var body = $('body');
    body.empty();
    body.append($('<div id="plot-container"></div>'));
    this.garden.plot_container = '#plot-container';
  },
  "create_plot": function() {
    var plot = this.garden.create_plot(Fixtures.Test_Plot);
    assert.equals(plot.meta_source.name, Fixtures.Test_Plot.name);

    var container = $('#plot-container');
    assert.same(container.children()[0], plot.element[0]);
  },
  "get_plot": function() {
    this.garden.irrigation.trellis_plots.warrior = Fixtures.Test_Plot;
    var plot = this.garden.get_plot('warrior');
    assert(plot);
    assert.equals(plot.meta_source.name, 'Test_Plot');

    var plot2 = this.garden.get_plot('warrior');
    assert.same(plot, plot2);

    plot = this.garden.get_plot('nothing');
    refute(plot);
  }
});

buster.testCase("Seed", {
  setUp: function() {
    this.garden = Fixtures.create_garden();
  },
  "test_load_model": function() {
    assert.isObject(this.garden);
    assert.isObject(this.garden.vineyard);
    assert.isObject(this.garden.vineyard.trellises);
    assert.isObject(this.garden.vineyard.trellises['warrior']);
  },
  "test_get_url": function() {
    var seed = this.garden.vineyard.trellises['warrior'].create_seed();
    seed.id = 12;
    assert.equals(seed.get_url('page'), 'dream/world/warrior/12')
  }
});