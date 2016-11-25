# electron-slide-down

**Create a hassle-free HTML5 slide deck with Electron, export/publish for the web on Github pages.**

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/flaki/electron-slide-down
# Go into the repository
cd electron-slide-down
# Install dependencies
npm install
# Create some source markdown
touch src/input.md
# Run the app
npm run start

# Choose your own source file
npm run start path/to/input.md
```

## Using `links`
Links generates a reading list from a file containing a bunch of links and
fetches metadata/page source etc. for those files for easy searchability.

```bash
# Clone repo and install dependencies as above

# Source file containing the links
touch src/links.md

# Generate www/links.html
npm run links
```

#### License [CC0 1.0 (Public Domain)](LICENSE.md)
