
module.exports = {
  verbose: true,
  setupFiles: [
    "./test-setup.js"
  ],
  moduleNameMapper: {
    "\\.(scss)$": "<rootDir>/node_modules/jest-css-modules"
  },
  testMatch: [
    "<rootDir>/src/tests/*.test.js"
  ]
};
