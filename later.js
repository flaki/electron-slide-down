'use strict';

const fetch = require('node-fetch'),
      fs = require('fs-extra'),
      path = require('path'),
      url = require('url');

const cheerio = require('cheerio');

const urlString = require('./lib/url.js').stringify;


let md = path.join(__dirname, 'src/later.md');
let list = fs.readFileSync(md).toString().split(/\r?\n/).filter(e => e.trim() !== '');

let out = fs.readFileSync(path.join(__dirname, 'template/later.html')).toString();

fs.ensureDirSync(path.join(__dirname, 'www/htmlcache'));
fs.ensureDirSync(path.join(__dirname, 'www/metadata'));

// TODO: only fetch non-cached documents
// TODO: re-fetch stale documents (check ts timestamp-property)
Promise.all( list.map( (e, i) => {
  let p = path.join(__dirname, 'www/htmlcache/'+urlString(list[i])+'.html' );
  try {
    return fs.readFileSync(p).toString();
  }
  catch(e) {}

  console.log(p, 'not found, fetching...');
  return fetch(e);
  // TODO: twitter responds in Hungarian
}) )
.then(resp => {
  return Promise.all(resp.map( e => typeof e === 'string' ? e : e.text() ));
})
.then(body => {
  let res = [];

  body.forEach( (bodytext, i) => {
    // Link object
    let e = {
      url: list[i],
      key: urlString(list[i]),
      body: bodytext,
      $: cheerio.load(bodytext),
      ts: Date.now(),
    };

    // Parse metadata
    getTitle(e);
    getIcon(e);

    res.push(e);
  });

  // Save metadata
  res.forEach(e => {
    // Save HTML
    fs.writeFileSync(path.join(__dirname, 'www/htmlcache/'+e.key+'.html'), e.body);

    // Purge unneccessary metadata properties
    delete e.$;
    e.body = e.body.substr(0,16)+'...';
    console.log(e);
    delete e.body;

    // Save metadata
    fs.writeFileSync(path.join(__dirname, 'www/metadata/'+e.key+'.json'), JSON.stringify(e));

    return e
  });


  // TODO: genarate and output src file
  let $ = cheerio.load('<ul></ul>');

  res.forEach(e => {
    let anchor = $('<a></a>')
      .attr('href', e.url)
      .attr('target', '_blank')
      .append(
        e.icon ? `<img src ="${e.icon}" alt="" /> ` : '',
        `<i>${e.title}</i>`
      );

    $('ul').append(
      $('<li></li>').append(anchor)
    ).append('\n');
  })
  out = out.replace(/\{mainContent\}/, $.html());
  out = out.replace(/\{title\}/, 'L8r');

  fs.writeFileSync(
    path.join(__dirname, 'www/later.html'),
    out
  );

}).catch(ex => {
  console.log('Error occured!');
  console.error(ex.stack || ex);
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
