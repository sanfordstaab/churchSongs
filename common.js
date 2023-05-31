// common.js

const g = {};

/**
 * short function name for document.getElementById();
 * @param {string} id 
 * @returns HTMLElement
 */
function ge(id) {
  const el = document.getElementById(id);
  console.assert(el);
  return el;
}

/**
 * Utility to hide and re-show an element
 * @param {string} elOrId
 * @param {boolean} fShow 
*/
g.shownDisplayClass = {};
function show(elOrId, fShow) {
  let el = elOrId;
  if (typeof(el) == 'string') {
    el = ge(elOrId);
  }
  if (fShow) {
    if (g.shownDisplayClass[elOrId]) {
      el.style.display = g.shownDisplayClass[elOrId];
      delete g.shownDisplayClass[elOrId];
    } else {
      if (el.tagName == 'SELECT') {
        el.style.display = 'inline-block';
      } else if (el.tagName == 'SPAN') {
        el.style.display = 'inline';
      } else {
        el.style.display = 'block';
      }
    }
  } else {
    g.shownDisplayClass[elOrId] = el.display;
    el.style.display = 'none';
  }
}

function hide(id) {
  show(id, false);
}

/**
 * Converts a floating point number to a number with
 * accuracy only cDigits right of the decimal point.
 * @param {number} value 
 * @param {number} cDigits 
 * @returns number
 */
function fixit(value, cDigits) {
  return Number(Number(value).toFixed(cDigits));
}
