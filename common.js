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

function renderPage(elHost, oMsg, width, height) {
  console.log(`height:${height}, width:${width}, AR:${g.aspectRatio}`);
  console.log('processMessage: ' + JSON.stringify(oMsg, null, 2));

  const tmpl = `
<container>
  <div id="divTopSpacer" style="margin-top:%spaceAbove%">
  </div>
  <content id="content">
    %content%
  </content>
  <footer class="smallest vat">
    <table width="100%">
      <tr>
        <td class="al">
          <span class="%pageNumbClass%">%pageNumber%</span>/<span class=%songNumbClass%">%songNumber%</span>
        </td>
        <td class="ar">
          %license%
        </td>
      </tr>
    </table>
  </footer>
</container>
`;

  if (Array.isArray(oMsg.content)) {
    let style = '';
    if (oMsg.fontSize) {
      style += `font-size: ${oMsg.fontSize * width}px; `;
    }
    if (oMsg.fontBoldness) {
      style += `font-weight: ${Number(oMsg.fontBoldness) * 100}; `;
    }
    if (oMsg.lineHeight) {
      style += `line-height: ${oMsg.lineHeight * height}px; `;
    }
    if (oMsg.allCaps) {
      style += `text-transform: uppercase; `;
    }
    let html = '';
    html = tmpl.replace('%spaceAbove%', oMsg.spaceAbove + 'em');
    console.assert(undefined != oMsg.pageNumber);
    console.assert(undefined != oMsg.songNumber);
    console.assert(undefined != oMsg.license);
    console.log(`style: ${style}`);
    el.style = style;
    html = html.replace('%content%', `
  <table width="100%" height="100%">
  <tr>
    <td colspan="100% width="100%">
      ${oMsg.content.join('<br>')}
    </td>
  </tr>
  </table>
  `).
    replace('%pageNumber%', oMsg.pageNumber).
    replace('%songNumber%', oMsg.songNumber).
    replace('%license%', oMsg.license).
    replace('%pageNumbClass%', oMsg.lastPage ? 'redText' : '').
    replace('%songNumbClass%', oMsg.lastSong ? 'redText' : '');
  } else { // blank page
    html = tmpl.
      replace('%content%', '').
      replace('$pageNumber%', '').
      replace('%songNumber%', '').
      replace('%license%', '').
      replace('%pageNumbClass%', '').
      replace('%songNumbClass%', '');
  }

  elHost.innerHTML = html;
}
