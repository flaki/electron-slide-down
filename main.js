const electron = require('electron');
const app = electron.app;

const fs = require('fs-extra');
const path = require('path');
const url = require('url');

const embed = require('./lib/embed.js');
const parser = require('./lib/parser.js');


app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function() {
  let src = process.argv[2] || 'src/input.md',
    target = process.argv[3] || 'www';

  parser.generate(src, target)
    .then(outFile => console.log(outFile, 'created.'))
    .then(_ => displaySlides(path.join(__dirname, target, 'index.html')))
    .catch(err => console.log(err));
});

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
