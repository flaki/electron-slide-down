'use strict';

document.addEventListener('DOMContentLoaded', e => {

  let first = document.querySelector('main>section:first-child');
  if (first) {
    first.classList.add('current');
  }

  window.addEventListener('keydown', e => {
    if (e.key==='ArrowLeft' || e.key==='PageUp') prevPage();
    if (e.key==='ArrowRight' || e.key==='PageDown' || e.key===' ') nextPage();

    // 8bitdo controller
    if (e.key==='d' || e.key==='e') prevPage();
    if (e.key==='f' || e.key==='c') nextPage();
  });

  function nextPage(e) {
    let current = document.querySelector('main>section.current');
    if (current && current.nextElementSibling) {
      current.classList.remove('current');
      current.nextElementSibling.classList.add('current');
    }
  }

  function prevPage(e) {
    let current = document.querySelector('main>section.current');
    if (current && current.previousElementSibling) {
      current.classList.remove('current');
      current.previousElementSibling.classList.add('current');
    }
  }
});
