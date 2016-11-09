const fs = require('fs-extra');
const path = require('path');


module.exports = {
  screenshotUrl
}


function screenshotUrl(urlOrSettings, filename) {
  const screenshot = require('electron-screenshot-app');

  const defaultSettings = {
    width: 1280,
    height: 720,

    // reduce file size by default - JPEG 80% quality
    format: 'jpeg',
    quality: 80,

    // Hide iframes by default (usually just ads)
    css: `iframe { display: none !important; }`,
  };
  let settings = {};

  if (typeof urlOrSettings!=='object') {
    settings = { url: String(urlOrSettings) };
  } else {
    settings = urlOrSettings;
  }

  // Make sure we're not fetching URLs already having a (recent) export
  try {
    // TODO: make async
    fs.accessSync(filename);

    // File exists and accessible, do not redownload
    console.log(`Skipping ${path.basename(filename)} (already exists)`);
    return Promise.resolve(filename);

  } catch (e) {}

  // Fetch new screenshot
  return new Promise((resolve, reject) => {
    screenshot(
      Object.assign({}, defaultSettings, settings),
      (err, image) => {
        if (err && err !=='[0] OK') {
          return reject(err);
        }

        // If filename specified write to file
        if (image && filename) {
          require('fs').writeFile(filename, image.data, err => {
            if (err) {
              return reject(err);
            }

            console.log(`Exported screenshot: ${path.basename(filename)}`);
            return resolve(filename);
          });

          return;

        // No filename, return image data
        } else {
          return resolve(image);
        }

        reject(new Error('Screenshot operation failed.'));
      }
    );

  });
}
