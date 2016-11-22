'use strict';

module.exports = {
  stringify,
}

function stringify(url) {
  return url.replace(/(^https?|\W+)/g,' ').trim().replace(/\s/g,'_')
}
