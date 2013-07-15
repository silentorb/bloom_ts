Fixtures = create_garden: ->
  garden = Garden.create()
  garden.attach_model test_model
  garden.app_path = 'dream'
  garden.initialize_irrigation()
  garden.irrigation.page_path = 'world'
  garden

new Block('simple-div', '<div></div>')
Fixtures.Test_Plot = Plot.subclass('Test_Plot',
  block: 'simple-div'
)

buster.testCase 'Irrigation',
  setUp: ->
    @irrigation = Fixtures.create_garden().irrigation

  'Garden.get_path_array': ->
    result = Irrigation.get_path_array('home/item/action', 'home')
    assert.equals result[0], 'item'
    assert.equals result[1], 'action'
    result = Irrigation.get_path_array('/home/item/action', 'home')
    assert.equals result[0], 'item'
    assert.equals result[1], 'action'
    result = Irrigation.get_path_array('home/item/action', '/home')
    assert.equals result[0], 'item'
    assert.equals result[1], 'action'
    result = Irrigation.get_path_array('item/action', '/')
    assert.equals result[0], 'item'
    assert.equals result[1], 'action'
    result = Irrigation.get_path_array('item/12', '/')
    assert.equals result[0], 'item'
    assert.equals result[1], 12

  initialize: ->
    irrigation = Fixtures.create_garden().irrigation
    assert.greater irrigation.channels.length, 1

  compare: ->
    assert @irrigation.compare(@irrigation.channels[1].pattern, 'warrior')

    assert @irrigation.compare('hello/frog', 'hello/frog')
    refute @irrigation.compare('hello/frog', 'hello/*')
    assert @irrigation.compare('hello/frog', ['hello', 'frog'])
    assert @irrigation.compare(['*', 'frog'], ['hello', 'frog'])
    refute @irrigation.compare(['*', 'frog'], 'b/c')
    refute @irrigation.compare('hello/frog', ['hello', 'frog', '2'])
    assert @irrigation.compare('hello/frog?', 'hello')
    assert @irrigation.compare('hello/frog?/is/cool', 'hello/frog/is/cool')
    assert @irrigation.compare('hello/frog?/is/cool', 'hello/is/cool')
    refute @irrigation.compare('track/todo/create', 'track/todo')

  find_channel: ->
    channel = @irrigation.find_channel('warrior/take')
    assert.isObject channel
    assert.equals channel.pattern[0], '%trellis'
    assert.equals channel.pattern[1], '%action?'

    channel = @irrigation.find_channel('warrior/10')
    assert.isObject channel
    assert.equals channel.pattern[0], '%trellis'
    assert.equals channel.pattern[1], '%id'

    channel = @irrigation.find_channel('warrior2/10')
    assert.isNull channel

  get_plot: ->
    @irrigation.trellis_plots.warrior = Fixtures.Test_Plot
    plot_type = @irrigation.get_plot('warrior')
    assert plot_type
    assert.same plot_type.name, 'Test_Plot'

  apply_pattern: ->
    channel = @irrigation.find_channel('warrior')
    assert channel
    result = @irrigation.apply_pattern(channel.pattern, ['warrior'])
    assert.equals result.trellis, 'warrior'

    result = @irrigation.apply_pattern(channel.pattern, ['warrior', 'die'])
    assert.equals result.trellis, 'warrior'
    assert.equals result.action, 'die'

  get_request_from_string: ->
    request = @irrigation.get_request_from_string('warrior')
    assert.equals request.trellis, 'warrior'

#  get_request: ->
#    #    var original_url = window.location.pathname;
#    history.pushState {}, '', '/dream/world/door/12'
#    assert.equals '/dream/world/door/12', location.pathname
#    irrigation = Fixtures.create_garden().irrigation
#    request = irrigation.get_request()
#    assert.equals request.path.length, 2
#    assert.equals request.trellis, 'door'
#    assert.equals request.id, 12
#    history.pushState {}, '', '/dream/world/door/create'
#    request = irrigation.get_request()
#    assert.equals request.action, 'create'
#    history.pushState {}, '', '/dream/world/door/12/delete'
#    request = irrigation.get_request()
#    assert.equals request.action, 'delete'
#    assert.equals request.id, 12

buster.testCase 'Garden',
  setUp: ->
    @garden = Fixtures.create_garden()
    body = $('body')
    body.empty()
    body.append $('<div id=\'plot-container\'></div>')
    @garden.plot_container = '#plot-container'

    @server = server = sinon.useFakeXMLHttpRequest()
    server.requests = []
    @server.onCreate = (request) ->
      server.requests.push request

  tearDown: ->
    @server.restore()

  create_plot: ->
    plot = @garden.create_plot(Fixtures.Test_Plot)
    assert.equals plot.meta_source.name, Fixtures.Test_Plot.name
    container = $('#plot-container')
    assert.same container.children()[0], plot.element[0]

  get_plot: ->
    @garden.irrigation.trellis_plots.warrior = Fixtures.Test_Plot
    request = @garden.irrigation.get_request_from_string('warrior')
    plot = @garden.get_plot(request)
    assert plot
    assert.equals plot.meta_source.name, 'Test_Plot'
    plot2 = @garden.get_plot(request)
    assert.same plot, plot2
    plot = @garden.get_plot('nothing')
    refute plot

  start: ->
    callback = sinon.spy()
    @garden.start callback
    @server.requests[0].respond 200,
      "Content-Type": "application/json" , '[{ "id": 12, "comment": "Hey there" }]'

    @server.requests[1].respond 200,
      "Content-Type": "application/json" , '[{ "id": 12, "comment": "Hey there" }]'

    assert callback.called

  test_load_model: ->
    assert.isObject @garden
    assert.isObject @garden.vineyard
    assert.isObject @garden.vineyard.trellises
    assert.isObject @garden.vineyard.trellises['warrior']
