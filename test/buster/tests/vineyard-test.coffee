buster.testCase "Arbor",
  "sort vines": ->
    properties =
      c:
        name: "c"

      d:
        name: "d"
        weight: 50

      a:
        name: "a"

      b:
        name: "b"
        weight: -1

    result = Arbor.sort_vines(properties)
    assert.equals result[0].name, "b"
    assert.equals result[1].name, "c"
    assert.equals result[2].name, "a"
    assert.equals result[3].name, "d"

  "seed cache": ->
    vineyard = Vineyard.create(test_model.trellises)
    orion = vineyard.trellises.warrior.create_seed(
      id: 10
      name: "Orion"
    )
    bow = vineyard.trellises.character_item.create_seed(
      id: 3
      owner: 10
      name: "bow"
    )
    assert.isObject bow.owner
    assert.equals bow.owner.name, "Orion"

  "seed cache override": ->
    vineyard = Vineyard.create(test_model.trellises)
    warrior_trellis = vineyard.trellises.warrior
    item_trellis = vineyard.trellises.character_item
    bow = item_trellis.create_seed(
      id: 3
      owner: 10
      name: "bow"
    )
    orion = warrior_trellis.create_seed(
      id: 10
      name: "Orion"
    )
    assert.equals warrior_trellis.get_connections("seed").length, 1
    assert.equals warrior_trellis.get_connections("seed")[0].name, "Orion"

  "seed cache embedded": ->
    vineyard = Vineyard.create(test_model.trellises)
    warrior_trellis = vineyard.trellises.warrior
    item_trellis = vineyard.trellises.character_item
    orion = warrior_trellis.create_seed(
      id: 10
      name: "Orion"
      inventory: [
        id: 3
        owner: 10
        name: "bow"
      ]
    )
    warriors = warrior_trellis.get_connections("seed")
    items = item_trellis.get_connections("seed")
    assert.equals warriors.length, 1
    assert.equals items.length, 1
    assert.equals warriors[0].name, "Orion"
    assert.equals items[0].name, "bow"
    refute.same warriors[0]._plantable, false
    refute.same items[0]._plantable, false


buster.testCase 'Seed',
  setUp: ->
    @vineyard = Vineyard.create(test_model.trellises)

  create_seed: ->
    seed = @vineyard.trellises.character_item.create_seed
      name: 'orc slayer'
      owner: 10

    assert.equals seed.name, 'orc slayer'
    refute seed._is_proxy, 'main seed is not marked proxy'

    assert seed.owner._is_proxy, 'sub object is marked proxy'

    seed = @vineyard.trellises.warrior.create_seed
      race: 'orc'
      inventory: [ 30 ]

    assert.equals seed.race, 'orc'
    refute seed._is_proxy, 'main seed is not marked proxy'
    assert.equals seed.inventory[0].id, 30
    assert seed.inventory[0]._is_proxy, 'sub object is marked proxy'

