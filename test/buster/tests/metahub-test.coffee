buster.testCase 'Meta_Object',

  invoke_async: ->
    a = Meta_Object.create()
    b = Meta_Object.create()
    c = Meta_Object.create()
    callback = sinon.spy()
    a_callback = sinon.spy()
    b_callback = sinon.spy()

    b.listen a, 'go', (fruit, done)->
      a_callback()
      done()

    c.listen a, 'go', (fruit, done)->
      b_callback()
      done()

    a.invoke_async 'go', 'banana', callback

    assert.called a_callback
    assert.called b_callback
    assert.called callback
    assert.calledWith callback, 'banana'

    callback = sinon.spy()
    b.invoke_async 'go', 'apple', callback
    assert.called callback
    assert.calledWith callback, 'apple'


