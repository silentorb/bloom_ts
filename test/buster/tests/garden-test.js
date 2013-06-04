// Generated by CoffeeScript 1.6.2
(function() {
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
      var irrigation;

      irrigation = Fixtures.create_garden().irrigation;
      assert(irrigation.compare(irrigation.channels[3].pattern, 'warrior'));
      assert(irrigation.compare('hello/frog', 'hello/frog'));
      assert(irrigation.compare('hello/frog', 'hello/*'));
      assert(irrigation.compare('hello/frog', ['hello', 'frog']));
      assert(irrigation.compare(['*', 'frog'], ['hello', 'frog']));
      refute(irrigation.compare(['*', 'frog'], 'b/c'));
      return refute(irrigation.compare('hello/frog', ['hello', 'frog', '2']));
    },
    find_channel: function() {
      var channel, irrigation;

      irrigation = Fixtures.create_garden().irrigation;
      channel = irrigation.find_channel('warrior/take');
      assert.isObject(channel);
      assert.equals(channel.pattern[0], '%trellis');
      assert.equals(channel.pattern[1], '%action');
      channel = irrigation.find_channel('warrior/10');
      assert.isObject(channel);
      assert.equals(channel.pattern[0], '%trellis');
      return assert.equals(channel.pattern[1], '%id');
    },
    get_plot: function() {
      var irrigation, plot_type;

      irrigation = Fixtures.create_garden().irrigation;
      irrigation.trellis_plots.warrior = Fixtures.Test_Plot;
      plot_type = irrigation.get_plot('warrior');
      assert(plot_type);
      return assert.same(plot_type.name, 'Test_Plot');
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
    },
    test_get_url: function() {
      var seed;

      seed = this.garden.vineyard.trellises['warrior'].create_seed();
      seed.id = 12;
      return assert.equals(seed.get_url('page'), 'dream/world/warrior/12');
    }
  });

}).call(this);
