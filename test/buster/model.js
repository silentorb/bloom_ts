var test_model = {
  "trellises": {
    "warrior": {
      "parent": "base",
      "properties": {
        "id": {
          "type": "int"
        },
        "race": {
          "type": "string"
        },
        "age": {
          "type": "int"
        },
        "inventory": {
          "type": "list",
          "trellis": "character_item"
        },
        "deeds": {
          "type": "list",
          "trellis": "deed"
        }
      }
    },
    "base": {
      "properties": {
        "id": {
          "type": "int"
        },
        "name": {
          "type": "string"
        }
      }
    },
    "character_item": {
      "properties": {
        "id": {
          "type": "int"
        },
        "name": {
          "type": "string"
        },
        "owner": {
          "type": "reference",
          "trellis": "warrior"
        }
      }
    },
    "achievement": {
      "parent": "base",
      "properties": {
        "parent": {
          "note": "Test for no reciprical reference.",
          "type": "reference",
          "trellis": "warrior"
        }
      }
    },
    "deed": {
      "parent": "base",
      "properties": {
        "parent": {
          "note": "Test for no reciprical reference.",
          "type": "reference",
          "trellis": "warrior"
        }
      }
    },
    "branch": {
      "plural": "branches",
      "properties": {
        "id": {
          "type": "int"
        },
        "name": {
          "type": "string"
        },
        "parent": {
          "type": "reference",
          "trellis": "branch",
          "property": "children"
        },
        "children": {
          "type": "list",
          "trellis": "branch",
          "property": "parent"
        }
      }
    }
  }
}