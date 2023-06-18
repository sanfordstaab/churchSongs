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
function show(elOrId, fShow=true) {
  if (Array.isArray(elOrId)) {
    elOrId.forEach(
      (item) => {
        show(item, fShow);
      }
    )
    return;
  }
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

/**
 * Common funciton to render either the projector or the preview
 * @param {object} elHost 
 * @param {object} oMsg 
 * @param {number} width 
 * @param {number} height 
 */
function renderPageToHost(elHost, oMsg, width, height) {
  const heightLeft = height - oMsg.spaceAbove;
  const tmpl = `
<div id="divTopSpacer" style="margin-top:%spaceAbove%;">
</div>
<content id="content" class="proj-content" style="line-height: %lineHeight%px;">
  <table width="${width}" height="${heightLeft}">
    <tr>
      <td colspan="100% width="100%">
        %content%
      </td>
    </tr>
  </table>
</content>
<div class="smallest vat proj-footer">
  <table width="100%" class="at">
    <tr>
      <td class="al">
        <span class="%pageNumbClass%">%pageNumber%</span><span class="%songNumbClass%">%songNumber%</span>
      </td>
      <td class="ar">
        %license%
      </td>
    </tr>
  </table>
</div>
`;
  let html = '';
  if (Array.isArray(oMsg.content)) {
    let style = '';
    if (oMsg.fontSize) {
      style += `font-size: ${oMsg.fontSize * width}px; `;
    }
    if (oMsg.fontBoldness) {
      style += `font-weight: ${Number(oMsg.fontBoldness) * 100}; `;
    }
    if (oMsg.allCaps) {
      style += `text-transform: uppercase; `;
    }
    html = tmpl.replace('%spaceAbove%', oMsg.spaceAbove + 'em');
    console.assert(undefined != oMsg.pageNumber);
    console.assert(undefined != oMsg.songNumber);
    console.assert(undefined != oMsg.license);
    elHost.style = style;
    elHost.classList.add('proj-host');

    html = html.replace('%content%', oMsg.content.join('<br>')).
    replace('%lineHeight%', oMsg.lineHeight * height).
    replace('%pageNumber%', oMsg.pageNumber).
    replace('%songNumber%', ' / ' + oMsg.songNumber).
    replace('%license%', oMsg.license).
    replace('%pageNumbClass%', oMsg.lastPage ? 'redText' : '').
    replace('%songNumbClass%', oMsg.fLastSongInSet ? 'redText' : '');

  } else { // blank page

    html = tmpl.
      replace('%content%', '').
      replace('%pageNumber%', '').
      replace('%songNumber%', '').
      replace('%license%', '').
      replace('%pageNumbClass%', '').
      replace('%songNumbClass%', '');
  }

  elHost.innerHTML = html;
}
