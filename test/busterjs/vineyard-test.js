buster.testCase("Arbor", {
    "states the obvious": function () {
        assert(true);
    },
    "sort_vines": function() {
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

    }
});