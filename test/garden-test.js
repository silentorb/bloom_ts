buster.testCase("Garden", {
  "Garden.get_path_array": function () {
    var result = Garden.get_path_array('home/item/action', 'home');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');

    var result = Garden.get_path_array('/home/item/action', 'home');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
    
    var result = Garden.get_path_array('home/item/action', '/home');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
    
    var result = Garden.get_path_array('item/action', '/');
    assert.equals(result[0], 'item');
    assert.equals(result[1], 'action');
  }
});