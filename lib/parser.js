const fs = require('fs-extra');
const path = require('path');
const url = require('url');

const cheerio = require('cheerio');
const fetch = require('node-fetch');

const markdownIt = require('markdown-it');

const embed = require('./embed.js');
const urlString = require('./url.js').stringify;

const __rootdir = path.join(__dirname,'..');


module.exports = {
  generate
}


function generate(srcFile, outFolder) {
  return new Promise( (resolve, reject) => {
    let md = markdownIt({
      linkify: false,
      typographer: true,
    });
    fs.readFile(path.join(__rootdir, srcFile), (err, source) => {
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
            src = $e.attr('src'),
            { hostname, pathname } = url.parse(src);

          // proper image
          if (pathname.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
            // do not transform
            return src;

          // tweet
          } else if (false) {

          // general link
          } else {
            let fn = urlString(src)+'.jpg';
            return embed.screenshotUrl(
                src, path.join(__rootdir, 'www/img', fn)
              ).then(
                _ => {
                  let url = 'img/'+fn;
                  $e.attr('src', url);

                  $e.parent().replaceWith(
                    $('<div class="hero"></div>').append($e)
                  );
                  $e.wrap($('<a target="_blank" href="'+src+'"></a>'));

                  return url;
                }
              ).catch(e => { console.log(e)}) ;
          }
        });

      Promise.all(urls).then(urls => {
        console.log(urls);

        // Update output
        out = $.html();

        // Read template file and render contents its contents with the rendered output
        fs.readFile(path.join(__rootdir, 'template/template.html'), (err, template) => {
          template = template.toString().replace(/\{mainContent\}/, out);

          const outFile = path.join(__rootdir, outFolder, 'index.html');
          fs.ensureDir(outFolder, err => {
            fs.writeFile(outFile, template, err => {
              if (err) reject(err);
              fs.copy(
                path.join(__rootdir, 'template/res'),
                path.join(__rootdir, outFolder, 'res'),
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
