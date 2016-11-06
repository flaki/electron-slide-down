const electron = require('electron');
const app = electron.app;

const fs = require('fs-extra');
const path = require('path');
const url = require('url');

const cheerio = require('cheerio');
const fetch = require('node-fetch');


app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function() {
  let src = process.argv[2] || 'src/input.md',
    target = process.argv[3] || 'www',
    urls = [
      'http://www.theverge.com/2016/5/20/11721890/uber-surge-pricing-low-battery',
      'https://api.twitter.com/1.1/statuses/oembed.json?id=507185938620219395',
    ];

  //screenshotUrl(getURL, 'uber.jpg').then(_ => console.log('Succcessfully exported ', getURL));
  generate(src, target)
    .then(outFile => console.log(outFile, 'created.'))
    .then(_ => displaySlides(path.join(__dirname, target, 'index.html')))
    .catch(err => console.log(err));
});



function generate(srcFile, outFolder) {
  const markdownIt = require('markdown-it');
  const markdownItAst = require('markdown-it-ast');

  return new Promise( (resolve, reject) => {
    let md = markdownIt({
      linkify: true,
      typographer: true,
    });
    fs.readFile(path.join(__dirname, srcFile), (err, source) => {
      if (err) reject(err);

      // Default heading renderer
      const defaultRenderer = function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      }
      const defaultHeadingOpen = md.renderer.rules.heading_open || defaultRenderer;

      // Change headings in so they split the document to "pages" (slides)
      md.renderer.rules.heading_open = function(tokens, idx, options, env) {
        if (!env.nextHeadingBlock) {
          env.nextHeadingBlock = true;
          return '<section>\n' + defaultHeadingOpen.apply(this, arguments);
        }

        return '</section>\n\n<section>\n' + defaultHeadingOpen.apply(this, arguments);
      }

      // Render environment object
      let env = {};

      // Ensure input is a string (not a buffer)
      let out = md.render(source.toString(), env);

      // Make sure we close the last section element
      if (env.nextHeadingBlock) {
        out += '</section>';
      }

      //
      let $ = cheerio.load(out);
      let urls = Array.from( $('a[href]').get() )
        .map( e => $(e).attr('href') );
      console.log( urls  );

      // Read template file and render contents its contents with the rendered output
      fs.readFile(path.join(__dirname, 'template/template.html'), (err, template) => {
        template = template.toString().replace(/\{mainContent\}/, out);

        const outFile = path.join(__dirname, outFolder, 'index.html');
        fs.ensureDir(outFolder, err => {
          fs.writeFile(outFile, template, err => {
            if (err) reject(err);
            fs.copy(
              path.join(__dirname, 'template/res'),
              path.join(__dirname, outFolder, 'res'),
              { clobber: true },
              err => {
                if (err) reject(err);
                resolve(outFile);
              }
            );
          });
        });

      });
    });
  });
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

  return new Promise((resolve, reject) => {
    screenshot(
      Object.assign({}, defaultSettings, settings),
      (err, image) => {
        if (err && err !=='[0] OK') {
          reject(err);
        }

        // If filename specified write to file
        if (filename) {
          require('fs').writeFile(filename, image.data, err => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          });

        // No filename, return image data
        } else {
          resolve(image);
        }
      }
    );

  });
}


function displaySlides(path) {
  // Create the browser window.
  wnd = new electron.BrowserWindow({width: 1280, height: 720});

  // and load the index.html of the app.
  wnd.loadURL(url.format({
    pathname: path,
    protocol: 'file:',
    slashes: true
  }));

  // Emitted when the window is closed.
  wnd.on('closed', function () {
    console.log('Finished.');
  });
}
