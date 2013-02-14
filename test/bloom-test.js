buster.testCase("Bloom", {
  "join path": function () {
    assert.equals('a/b', Bloom.join('a', 'b'));
    assert.equals('a', Bloom.join('a', null));
    assert.equals('/b', Bloom.join('', '/b'));
    assert.equals('a/b', Bloom.join('a/', 'b'));
    assert.equals('a/b', Bloom.join('a', '/b'));
    assert.equals('a/b', Bloom.join('a/', '/b'));
    assert.equals('/b', Bloom.join('/', 'b'));
    assert.equals('a/1', Bloom.join('a', 1));
    
    // Triple arguments
    assert.equals('a/b/c', Bloom.join('a', 'b', 'c'));
  }
});