// Check for AVIF support
const supportsAVIF = (() => {
  let canvas = document.createElement('canvas');
  return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
})();

// Check for WebP support
const supportsWebP = (function () {
  let canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
})();

// Debounce utility
var viewHeight = document.documentElement.clientHeight;

function debounce(fn, delay) {
  let timer = null;
  return function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

function lazyLoadImgs() {
  document.querySelectorAll('img[data-load], source[data-load]').forEach(function (el) {
    let rect = el.closest('.game_section4').getBoundingClientRect();

    if (
      rect.bottom >= 0 &&
      rect.top < viewHeight &&
      rect.right >= 0 &&
      rect.left < window.innerWidth &&
      !el.dataset.loaded
    ) {
      // Only for IMG: show loader and handle onload
      if (el.tagName === 'IMG') {
        let loader = el.closest('.game_section4').querySelector('.img-loader');
        if (loader) loader.style.display = 'block';

        el.onload = function () {
          this.style.display = 'block';
          if (loader) loader.style.display = 'none';
        };

        el.src = el.dataset.load;
      } else if (el.tagName === 'SOURCE') {
        el.srcset = el.dataset.load;
      }

      el.setAttribute('data-loaded', 'true');
    }
  });
}

// Initial load
lazyLoadImgs();

// Scroll and resize listeners
document.addEventListener('scroll', debounce(lazyLoadImgs, 10));
document.addEventListener(
  'resize',
  debounce(() => {
    viewHeight = document.documentElement.clientHeight;
    lazyLoadImgs();
  }, 200),
);


