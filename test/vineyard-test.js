Vineyard.import_all();
if (!window.Page) {
  window.Page = {};
}

function _Vineyard() {

  test("Vineyard.create", function() {
    ok(Object.keys(Page.vineyard.trellises).length > 0, "Vineyard has trellises.");    
  });
  
}

function _Trellis() {

//  test("Block.load", function() {
//    equal(Block.library['div'], undefined, "div block is undefined.");
//    stop();
//    Block.load('div', function(block) {
//      ok(block.html.length > 0, "block.html has content.");
//      start();
//    });   
//  });
  
}
$(function(){
  QUnit.config.testTimeout = 5000;
  stop();
  Bloom.get('resources/model.json', function(response) {
    Page.vineyard = Vineyard.create(response.classes);
    start();
    _Vineyard();
    _Trellis();
  }); 
//  _Block();
//  _Flower();
//  _List();
  
});