'use strict';

const fetch = require('node-fetch'),
      fs = require('fs-extra'),
      path = require('path'),
      url = require('url');

const cheerio = require('cheerio');

const urlString = require('./lib/url.js').stringify;


let md = path.join(__dirname, 'src/links.md');

let lines = fs.readFileSync(md).toString()
  .split(/\r?\n/)
  .filter(e => e.trim() !== '');

let list = [];

function newBlock(ln) {
  if (list.length === 0 || list[list.length-1].length !== 0) {
    list.push({
      tags: [], links: []
    });
  }
}

function allTags(s) {
  let rx = /(?:^|\s)(#[\w-]+)/g;
  let m, ret = [];

  while (m = rx.exec(s)) {
    ret.push(m[1]);
  };

  return ret;
}

function canonicalUrl(url) {

  // Google tracking codes
  url = url.replace(/(#|\?)((utm_\w+|\w+-id)\=[^&]*(\&|$))+/g,'');

  // Twitter
  if (url.match(/twitter\.com/)) {
    // mobile urls
    url = url.replace(/\/\/(m|mobile)\./, '//');

    // share/language codes
    url = url.replace(/(\?|&)(s|lang)\=[^&]+/g, '');
  }

  // Youtube
  if (url.match(/youtube\.com/)) {
    let m = url.match(/(?:&|\?)v=([a-yA-Z0-9!_-]+)/);

    if (m) {
      url = 'https://youtube.com/watch?v='+m[1]
    }
  }

  return url;
}

lines.forEach(ln => {
  let b;

  if (list.length === 0 || ln.match(/^[_\s\-]*$/)) {
    newBlock(ln);

  } else {
    b = list[list.length-1];
    let url = ln.match(/https?:\/\/\S+/);
    let meta = ln.replace(/https?:\/\/\S+/, '').trim();

    if (url) {
      let cUrl = canonicalUrl(url[0]);
      b.links.push({
        meta: meta.length ? meta : undefined,
        tags: allTags(meta),
        url: cUrl,
        original_url: url[0] === cUrl ? undefined : url[0],
        key: urlString(cUrl)
      });


    } else {
      newBlock(ln);
      b = list[list.length-1];

      b.tags.push(...allTags(ln));
    }
  }
});


//console.log(JSON.stringify(list));
//fs.writeFileSync(md.replace(/\.md$/, '.json'), JSON.stringify(list, null, 2));
//process.exit(0);

function loadMeta(e) {
  return Promise.resolve().then(() => {
    let p = path.join(__dirname, 'www/htmlcache/'+e.key+'.html' );
    try {
      return fs.readFileSync(p).toString();
    }
    catch(ex) {}

    console.log(p, 'not found, fetching...');
    return fetch(e.url).then(e => e.text()).then(bodytext => {
      // Cache HTML response
      fs.writeFileSync(path.join(__dirname, 'www/htmlcache/'+e.key+'.html'), bodytext);

      return bodytext;
    });
    // TODO: twitter responds in Hungarian
    // add ?lang=en param to twitter urls

  }).then(bodytext => {
    // Link object
    e.ts = Date.now();

    // Non-serializable data (not showing up in the metadata dump)
    Object.defineProperty(e, 'body', { value: bodytext });
    Object.defineProperty(e, '$', { value: cheerio.load(bodytext) });

    // Parse metadata
    getTitle(e);
    getIcon(e);

    // Per-service metadata and further work
    let promise;
    let parsedUrl = url.parse(e.url),
      hostname = parsedUrl.hostname,
      pathname = parsedUrl.pathname;

    // Twitter (get oEmbed data)
    if (hostname.match(/twitter\.com/)) {
      // TODO: have all these responses cached too
      promise = fetch('https://publish.twitter.com/oembed?url='+require('querystring').escape(e.url))
        .then(r => r.json())
        .then(r => {
          e.oembed = r;

          //console.log(e);
          return e;
        })
    }

    // This may not be all, e.g. tweet can contain embedded links, that
    // would trigger further processing.
    // TODO: make this extensible by using a custom promise/resolve flow
    return promise||e;

  // Cache metadata
  }).then(e => {
    // Save metadata
    fs.writeFileSync(path.join(__dirname, 'www/metadata/'+e.key+'.json'), JSON.stringify(e, null, 2));

    return e;

  // Error handler
  }).catch(ex => {
    console.log('Error occured!');
    console.error(ex.stack || ex);
  });

}

fs.ensureDirSync(path.join(__dirname, 'www/htmlcache'));
fs.ensureDirSync(path.join(__dirname, 'www/metadata'));

// TODO: re-fetch stale documents (check ts timestamp-property)
let mainContent = [];

list.forEach(block => {
  let blockStatus = [];

  // Get metadata
  block.links.forEach( e => blockStatus.push(loadMeta(e)) );

  // Wait for all metadata to be fetched, generate content output
  mainContent.push( Promise.all(blockStatus).then(() => {
    let $ = cheerio.load(`<section>
  <h1></h1>
  <ul></ul>
<section>`);

    block.links.forEach(e => {
      let anchor = $('<a></a>')
        .attr('href', e.url)
        .attr('title', e.title.replace(/\r?\n/g,'&#x0A;'))
        .attr('target', '_blank')
        .append(
          e.icon ? `<img src ="${e.icon}" alt="" /> ` : '',
          `<i>${e.title}</i>`
        );

      $('ul').append(
        $('<li></li>').append(anchor)
      ).append('\n');

      $('h1').text(block.tags.join(' '));
    });

    return $.html();
  }));
});

// Genarate and output html file
Promise.all(mainContent).then((mainContentBlocks) => {
  // Write updated list
  console.log(JSON.stringify(list, null, 1))
  fs.writeFileSync(md.replace(/\.md$/, '.json'), JSON.stringify(list, null, 2));

  // Output generated main content file
  let out = fs.readFileSync(path.join(__dirname, 'template/links.html')).toString();

  out = out.replace(/\{mainContent\}/, mainContentBlocks.join('\n\n'));
  out = out.replace(/\{title\}/, 'Links');

  fs.writeFileSync(
    path.join(__dirname, 'www/links.html'),
    out
  );
});



function getTitle(e) {
  e.title = e.$('title').text();
}

function getIcon(e) {
  let icon;

  icon = e.$('link[rel~="icon"][href$=".png"]').attr('href')
      || e.$('link[rel][href$=".ico"]').attr('href');

  if (icon) {
    e.icon = url.resolve(e.url, icon);
    return;
  }

  // TODO: RegExp fallback
}

function getImage(e) {}

function getIntro(e) {}
