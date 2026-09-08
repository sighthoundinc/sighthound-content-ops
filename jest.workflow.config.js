const nextJest = require("next/jest");

module.exports = nextJest({ dir: "./" })({
  testEnvironment: "jest-environment-node",
  roots: ["<rootDir>/tests/workflow"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  watchman: false,
});
