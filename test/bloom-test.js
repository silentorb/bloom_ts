buster.testCase("Bloom", {
  "join path": function () {
    assert.equals('a/b', Bloom.join('a', 'b'));
    assert.equals('a', Bloom.join('a', null));
    assert.equals('/b', Bloom.join('', '/b'));
    assert.equals('a/b', Bloom.join('a/', 'b'));
    assert.equals('a/b', Bloom.join('a', '/b'));
    assert.equals('a/b', Bloom.join('a/', '/b'));
    assert.equals('/b', Bloom.join('/', 'b'));
  }
});