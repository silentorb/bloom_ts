var config = module.exports;

config["My tests"] = {
  rootPath: "../",
  environment: "browser", // or "node"
  sources: [
  "js/metahub.js",
  "js/bloom.js",
  "js/vineyard.js",
  "js/garden.js"
  ],
  tests: [
  "test/*-test.js"
  ]
}

// Add more configuration groups as needed