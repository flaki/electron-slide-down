'use strict';

const fetch = require('node-fetch'),
      fs = require('fs-extra'),
      path = require('path'),
      url = require('url');

const cheerio = require('cheerio');

const urlString = require('./lib/url.js').stringify;


let md = path.join(__dirname, 'src/later.md');
let list = fs.readFileSync(md).toString().split(/\r?\n/).filter(e => e.trim() !== '');

// debug: choose just one item
// TODO: cache items properly and only refresh after N time, then remove this
let sel = Math.random()*list.length|0;
console.log(sel)
list = list.slice(sel, sel+1);

let out = fs.readFileSync(path.join(__dirname, 'template/template.html'));

fs.ensureDirSync(path.join(__dirname, 'www/htmlcache'));
fs.ensureDirSync(path.join(__dirname, 'www/metadata'));

// TODO: only fetch non-cached documents
// TODO: re-fetch stale documents (check ts timestamp-property)
Promise.all( list.map( e => fetch(e) ) )
.then(resp => {
  return Promise.all(resp.map( e => e.text() ));
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




}).catch(ex => {
  console.log('Error occured!');
  console.error(ex.stack || ex);
});



function getTitle(e) {
  e.title = e.$('title').text();
}

function getIcon(e) {
  let icon;

  icon = e.$('link[rel="icon"][href$=".png"]').attr('href')
      || e.$('link[rel][href$=".ico"]').attr('href');

  if (icon) e.icon = url.resolve(e.url, icon);
}

function getImage(e) {}

function getIntro(e) {}
