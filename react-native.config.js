module.exports = {
  dependencies: {
    // react-native-health is iOS-only — disable autolinking on Android
    // to prevent native crashes on Android builds.
    'react-native-health': {
      platforms: {
        android: null,
      },
    },
  },
};
