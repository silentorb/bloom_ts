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
    var james = vineyard.trellises.character.create(data);
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

    var book = vineyard.trellises.book.create(data);
    ok(book.characters[0].trellis === vineyard.trellises.character, "Book property has reference to correct Trellis");
  });
  
}

var vineyard;
$(function(){
  QUnit.config.testTimeout = 5000;
  stop();
  Bloom.get('resources/model.json', function(response) {
    vineyard = Vineyard.create(response.classes);
    start();
    _Vineyard();
    _Trellis();
  }); 
//  _Block();
//  _Flower();
//  _List();
  
});