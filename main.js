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
    target = process.argv[3] || 'www';

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
      linkify: false,
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
//      let urls = Array.from( $('a[href]').get() )
//        .map( e => $(e).attr('href') );
      let urls = Array.from( $('img[src]').get() )
        .map( e => {
          let $e = $(e),
            src = $e.attr('src');

          // proper image
          if (src.match(/\.(png|jpg|jpeg|gif)$/)) {
            // do not transform
            return src;

          // tweet
          } else if (false) {

          // general link
          } else {
            let fn = src.replace(/(^https?|\W+)/g,' ').trim().replace(/\s/g,'_')+'.jpg';
            return screenshotUrl(
                src, path.join(__dirname, 'www/img', fn)
              ).then(
                _ => {
                  let url = 'img/'+fn;
                  $e.attr('src', url);
                  $e.wrap($('<a href="'+src+'"></a>'));
                  return url;
                }
              );
          }
        });

      Promise.all(urls).then(urls => {
        console.log(urls);

        // Update output
        out = $.html();

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
    app.quit();
  });
}
