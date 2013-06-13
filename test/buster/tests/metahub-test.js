// Generated by CoffeeScript 1.3.3

buster.testCase('Meta_Object', {
  invoke_async: function() {
    var a, a_callback, b, b_callback, c, callback;
    a = Meta_Object.create();
    b = Meta_Object.create();
    c = Meta_Object.create();
    callback = sinon.spy();
    a_callback = sinon.spy();
    b_callback = sinon.spy();
    b.listen(a, 'go', function(fruit, done) {
      a_callback();
      return done();
    });
    c.listen(a, 'go', function(fruit, done) {
      b_callback();
      return done();
    });
    a.invoke_async('go', 'banana', callback);
    assert.called(a_callback);
    assert.called(b_callback);
    assert.called(callback);
    assert.calledWith(callback, 'banana');
    callback = sinon.spy();
    b.invoke_async('go', 'apple', callback);
    assert.called(callback);
    return assert.calledWith(callback, 'apple');
  }
});
