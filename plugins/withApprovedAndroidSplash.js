const { withDangerousMod } = require('expo/config-plugins');
const { generateImageAsync } = require('@expo/image-utils');
const fs = require('fs/promises');
const path = require('path');

// Android 12 mandates an icon-sized native splash. Expo always contains portrait
// images inside that square, creating a small rectangular image. Crop the same
// approved source to fill the native square instead; never use the launcher icon
// or add a second React splash.
module.exports = (config) => withDangerousMod(config, ['android', async (mod) => {
  for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
    const { source } = await generateImageAsync(
      { projectRoot: mod.modRequest.projectRoot, cacheType: 'onefc-approved-splash' },
      { src: './assets/splash/onefc-splash.png', width: 288 * scale, height: 288 * scale, resizeMode: 'cover' },
    );
    for (const theme of ['drawable', 'drawable-night']) {
      const directory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res', `${theme}-${density}`);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, 'splashscreen_logo.png'), source);
    }
  }
  return mod;
}]);
