import tsJestPreset from "ts-jest/presets/default-esm/jest-preset.js";

export default {
  ...tsJestPreset,
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: {
    ...tsJestPreset.transform,
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json'
      }
    ]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {},
  clearMocks: true,
  restoreMocks: true
};
