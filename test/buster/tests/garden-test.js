// Generated by CoffeeScript 1.3.3
var Fixtures;

Fixtures = {
  create_garden: function() {
    var garden;
    garden = Garden.create();
    garden.attach_model(test_model);
    garden.app_path = 'dream';
    garden.initialize_irrigation();
    garden.irrigation.page_path = 'world';
    return garden;
  }
};

new Block('simple-div', '<div></div>');

Fixtures.Test_Plot = Plot.subclass('Test_Plot', {
  block: 'simple-div'
});

buster.testCase('Irrigation', {
  setUp: function() {
    return this.irrigation = Fixtures.create_garden().irrigation;
  },
  'Garden.get_path_array': function() {
    var result;
    result = Irrigation.get_path_array('home/item/action', 'home');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
    result = Irrigation.get_path_array('/home/item/action', 'home');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
    result = Irrigation.get_path_array('home/item/action', '/home');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
    result = Irrigation.get_path_array('item/action', '/');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
    result = Irrigation.get_path_array('item/12', '/');
    assert.equals(result[0], 'item');
    return assert.equals(result[1], 12);
  },
  initialize: function() {
    var irrigation;
    irrigation = Fixtures.create_garden().irrigation;
    return assert.greater(irrigation.channels.length, 3);
  },
  compare: function() {
    assert(this.irrigation.compare(this.irrigation.channels[3].pattern, 'warrior'));
    assert(this.irrigation.compare('hello/frog', 'hello/frog'));
    assert(this.irrigation.compare('hello/frog', 'hello/*'));
    assert(this.irrigation.compare('hello/frog', ['hello', 'frog']));
    assert(this.irrigation.compare(['*', 'frog'], ['hello', 'frog']));
    refute(this.irrigation.compare(['*', 'frog'], 'b/c'));
    return refute(this.irrigation.compare('hello/frog', ['hello', 'frog', '2']));
  },
  find_channel: function() {
    var channel;
    channel = this.irrigation.find_channel('warrior/take');
    assert.isObject(channel);
    assert.equals(channel.pattern[0], '%trellis');
    assert.equals(channel.pattern[1], '%action');
    channel = this.irrigation.find_channel('warrior/10');
    assert.isObject(channel);
    assert.equals(channel.pattern[0], '%trellis');
    assert.equals(channel.pattern[1], '%id');
    channel = this.irrigation.find_channel('warrior2/10');
    return assert.isNull(channel);
  },
  get_plot: function() {
    var plot_type;
    this.irrigation.trellis_plots.warrior = Fixtures.Test_Plot;
    plot_type = this.irrigation.get_plot('warrior');
    assert(plot_type);
    return assert.same(plot_type.name, 'Test_Plot');
  },
  apply_pattern: function() {
    var channel, result;
    channel = this.irrigation.find_channel('warrior');
    assert(channel);
    result = this.irrigation.apply_pattern(['warrior'], channel.pattern);
    return assert.equals(result.trellis, 'warrior');
  },
  get_request_from_string: function() {
    var request;
    request = this.irrigation.get_request_from_string('warrior');
    return assert.equals(request.trellis, 'warrior');
  }
});

buster.testCase('Garden', {
  setUp: function() {
    var body, server;
    this.garden = Fixtures.create_garden();
    body = $('body');
    body.empty();
    body.append($('<div id=\'plot-container\'></div>'));
    this.garden.plot_container = '#plot-container';
    this.server = server = sinon.useFakeXMLHttpRequest();
    server.requests = [];
    return this.server.onCreate = function(request) {
      return server.requests.push(request);
    };
  },
  tearDown: function() {
    return this.server.restore();
  },
  create_plot: function() {
    var container, plot;
    plot = this.garden.create_plot(Fixtures.Test_Plot);
    assert.equals(plot.meta_source.name, Fixtures.Test_Plot.name);
    container = $('#plot-container');
    return assert.same(container.children()[0], plot.element[0]);
  },
  get_plot: function() {
    var plot, plot2, request;
    this.garden.irrigation.trellis_plots.warrior = Fixtures.Test_Plot;
    request = this.garden.irrigation.get_request_from_string('warrior');
    plot = this.garden.get_plot(request);
    assert(plot);
    assert.equals(plot.meta_source.name, 'Test_Plot');
    plot2 = this.garden.get_plot(request);
    assert.same(plot, plot2);
    plot = this.garden.get_plot('nothing');
    return refute(plot);
  },
  start: function() {
    var callback;
    callback = sinon.spy();
    this.garden.start(callback);
    this.server.requests[0].respond(200, {
      "Content-Type": "application/json"
    }, '[{ "id": 12, "comment": "Hey there" }]');
    this.server.requests[1].respond(200, {
      "Content-Type": "application/json"
    }, '[{ "id": 12, "comment": "Hey there" }]');
    return assert(callback.called);
  }
});

buster.testCase('Seed', {
  setUp: function() {
    return this.garden = Fixtures.create_garden();
  },
  test_load_model: function() {
    assert.isObject(this.garden);
    assert.isObject(this.garden.vineyard);
    assert.isObject(this.garden.vineyard.trellises);
    return assert.isObject(this.garden.vineyard.trellises['warrior']);
  }
});
