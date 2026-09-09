module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // The library's own documented Jest setup - the real native module
    // isn't available in the test environment, so its internal async state
    // machine throws without this (see @react-native-community/netinfo's
    // "Testing" docs).
    '^@react-native-community/netinfo$': '@react-native-community/netinfo/jest/netinfo-mock.js',
  },
};
