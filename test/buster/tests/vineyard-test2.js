buster.testCase("Arbor", {
  
  "sort vines": function() {
    var properties = {
      "c": {
        "name": "c"
      },
      "d": {
        "name": "d",
        "weight": 50
      },
      "a": {
        "name": "a"
      },
      "b": {
        "name": "b",
        "weight": -1
      }
    };
      
    var result = Arbor.sort_vines(properties);
    assert.equals(result[0].name, 'b');
    assert.equals(result[1].name, 'c');
    assert.equals(result[2].name, 'a');
    assert.equals(result[3].name, 'd');
  },
    
  "seed cache": function() {
    var vineyard = Vineyard.create(test_model.trellises);
    var orion = vineyard.trellises.warrior.create_seed({
      id: 10,
      name: 'Orion'
    });
      
    var bow = vineyard.trellises.character_item.create_seed({
      id: 3,
      owner: 10,
      name: 'bow'
    });
      
    assert.isObject(bow.owner);
    assert.equals(bow.owner.name, 'Orion');
  },
    
  "seed cache override": function() {
    var vineyard = Vineyard.create(test_model.trellises);
    var warrior_trellis = vineyard.trellises.warrior;
    var item_trellis = vineyard.trellises.character_item;
    
    var bow = item_trellis.create_seed({
      id: 3,
      owner: 10,
      name: 'bow'
    });
      
    var orion = warrior_trellis.create_seed({
      id: 10,
      name: 'Orion'
    });
    
    assert.equals(warrior_trellis.get_connections('seed').length, 1);
    assert.equals(warrior_trellis.get_connections('seed')[0].name, 'Orion');
  },
  
  "seed cache embedded": function() {
    var vineyard = Vineyard.create(test_model.trellises);
    var warrior_trellis = vineyard.trellises.warrior;
    var item_trellis = vineyard.trellises.character_item;
    
    var orion = warrior_trellis.create_seed({
      id: 10,
      name: 'Orion',
      inventory: [{
        id: 3,
        owner: 10,
        name: 'bow'
      }]
    });

    var warriors = warrior_trellis.get_connections('seed');
    var items = item_trellis.get_connections('seed');
    assert.equals(warriors.length, 1);
    assert.equals(items.length, 1);
    assert.equals(warriors[0].name, 'Orion');
    assert.equals(items[0].name, 'bow');
    refute.same(warriors[0]._plantable, false);
    refute.same(items[0]._plantable, false);
  }
});