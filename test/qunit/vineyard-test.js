Vineyard.import_all();

function _Vineyard() {
  test("Vineyard.create", function() {
    ok(Object.keys(vineyard.trellises).length > 0, "Vineyard has trellises.");
    equal(typeof vineyard.trellises.character, 'object', "Character Trellis exists");
    equal(typeof vineyard.trellises.book, 'object', "Book Trellis exists");
    strictEqual(vineyard.trellises.character.properties.id.readonly, true, "Character id is readonly");
  });
  
}

function _Trellis() {

  test("Trellis.create", function() {
    var data;
    data = {
      "id": 1,
      "gender": "male",
      "personality": "INP",
      "name": "James",
      "class": "character",
      "books": [
      {
        "id": 1,
        "name": "marloth"
      }
      ]
    };
    
    // I'm not using any form of 'equal' because QUnit hangs printing out the vast object tree
    // and doesn't appear to have any way for me to stop it.
    var james = vineyard.trellises.character.create_seed(data);
    ok(james.books[0].trellis === vineyard.trellises.book, "Book property has reference to correct Trellis");

    data = {
      "id": 1,
      "name": "marloth",
      "characters": [
      {
        "id": 1,
        "gender": "male",
        "personality": "INP",
        "name": "James",
        "class": "character"
      },
      {
        "id": 2,
        "gender": "female",
        "personality": "ENFJ",
        "name": "Adelle",
        "class": "character"
      }
      ]

    };

  //    var book = vineyard.trellises.book.create_seed(data);
  //    ok(book.characters[0].trellis === vineyard.trellises.character, "Book property has reference to correct Trellis");
  });
  
}

function _Irrigation() {
  var Fixtures = {
    initialize_garden: function() {
      var garden = Garden.create();
      //      garden.attach_model(test_model);
      garden.app_path = 'dream';
      garden.initialize_irrigation();
      garden.irrigation.page_path = 'world';
      return garden;
    }
  }
  test("Irrigation.get_path_array", function() {
    var result = Irrigation.get_path_array('home/item/action', 'home');
    equal(result[0], 'item');
    equal(result[1], 'action');

    var result = Irrigation.get_path_array('/home/item/action', 'home');
    equal(result[0], 'item');
    equal(result[1], 'action');
    
    var result = Irrigation.get_path_array('home/item/action', '/home');
    equal(result[0], 'item');
    equal(result[1], 'action');
    
    var result = Irrigation.get_path_array('item/action', '/');
    equal(result[0], 'item');
    equal(result[1], 'action');
    
    var result = Irrigation.get_path_array('item/12', '/');
    equal(result[0], 'item');
    equal(result[1], 12);
    
    var result = Irrigation.get_path_array('home/item/action', '/home/something', '');
    equal(result[0], 'item');
    equal(result[1], 'action');
    
    var result = Irrigation.get_path_array('home/something/item/action', '/home/something', '');
    equal(result[0], 'item');
    equal(result[1], 'action');
  });
  
  test('Irrigation.get_request', function() {
    var irrigation = Fixtures.initialize_garden().irrigation;

    var request = irrigation.get_request_from_string('/dream/world/door/12');
    equal(request.path.length, 2);
    equal(request.trellis, 'door');
    equal(request.id, 12);
    
    var request = irrigation.get_request_from_string('/dream/world/door/create');
    equal(request.action, 'create');
    
    var request = irrigation.get_request_from_string('/dream/world/door/12/delete');
    equal(request.action, 'delete'); 
    equal(request.id, 12);
  });
  
}

var vineyard;
$(function(){
  QUnit.config.testTimeout = 5000;
  stop();
  Bloom.get('resources/model.json', function(response) {
    vineyard = Vineyard.create(response.trellises);
    start();
    _Vineyard();
    _Trellis();
    _Irrigation();
  }); 
//  _Block();
//  _Flower();
//  _List();
  
});