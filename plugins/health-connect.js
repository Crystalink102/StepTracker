const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function healthConnectPlugin(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Add Health Connect permissions rationale intent filter
    const mainActivity = manifest.application[0].activity[0];
    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }

    // Check if already added
    const hasHealthIntent = mainActivity['intent-filter'].some((filter) =>
      filter.action?.some(
        (a) =>
          a.$?.['android:name'] ===
          'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE'
      )
    );

    if (!hasHealthIntent) {
      mainActivity['intent-filter'].push({
        action: [
          {
            $: {
              'android:name':
                'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE',
            },
          },
        ],
      });
    }

    return config;
  });
};
