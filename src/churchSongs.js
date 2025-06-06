// churchSongs.js

async function onPageLoad(event) {
  onstorage = (event) => {
    if (event.key == 'projectorKeyDown') {
      let code = event.newValue;  // if localStorage event
      if (!event.newValue) {
        code = event.code;
      }
      if (code) {
        console.log(`Controller recieved key code: ${code}`);
        processKeyCode(code);
      }
    }
    if (event.key == 'AR-message' && event.newValue != null) {
      processARChanged(event.newValue);
    }
  }

  initSiteUI();

  // hide sections we dont want to see initially
  toggleFieldsetVisibility({ target: ge('fsProjector').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsSongOrSetSelection').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsNav').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsGeneralFormatting').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsCreateOrEditSongSet').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsCreateOrEditSong').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsExportImport').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsSearch').firstElementChild.firstElementChild });

  await delay(1);
  onShowSongSet();
}

function initSiteUI() {
  // make sure we have defined at least a minimum set of data
  if (!songLibrary) {
    songLibrary = {};
  }
  if (!songLibrary.oSongSets) {
    songLibrary.oSongSets = {};
  }
  if (!songLibrary.oSongs) {
    songLibrary.oSongs = {};
  }

  if (!songLibrary.defaults) {
    songLibrary.defaults = {};
  }

  // check for common mistakes when manually editing the data
  checkSongLibrary();

  // flesh out any missing fields for clarity and simplicity of code
  healSongLibrary();

  renderSongSetDropdown(
    'selNavSongSets', 
    'txtNavSongSetFilter', 
    '',
    'spnNoSongSets');

  renderSongSetDropdown(
    'selAllSongSetsToEdit', 
    'txtSongSetEditFilter',
    '',
    'spnNoSongSetsToEdit');     
  editSelectedSongSet();

  reRenderAllSongSelectControls('', '');

  // Nav init
  ge('chkNavSongSetMode').checked = true;

  // Nav formatting init
  ge('chkAllCaps').checked = songLibrary.defaults.allCaps ? 'checked' : '';
  ge('chkGenerateTitles').checked = songLibrary.defaults.generateTitle ? 'checked' : '';
  renderNavSection();

  // song editing init
  hide('spnVerseUpdatedNotice');
  initSongSetEditUI();
  initSongEditUI();
  fillSongToEdit();

  // AR UI init
  renderAspectRatioText();

  checkForEmptySongsOrSongSets();
  hide('divHelp');

  setTimeout(() => {
    window.scrollTo(0, -document.body.clientHeight);
  }, 1);
}

function checkForEmptySongsOrSongSets() {
  const songSetName = ge('selNavSongSets').value;
  const fIsSongSetMode = ge('chkNavSongSetMode').checked;
  const fIsEmptySongSetSelected = 
    fIsSongSetMode && 
    songSetName && 
    (!songLibrary.oSongSets[songSetName] ||
      songLibrary.oSongSets[songSetName].length == 0);
  const fHasSongs = Object.keys(songLibrary.oSongs).length > 0 && !fIsEmptySongSetSelected;
  const cSongSets = Object.keys(songLibrary.oSongSets).length;
  show('tdProjectorSection', fHasSongs);
  show('trSongOrSongSetSelection', fHasSongs);
  show('trNavSection', fHasSongs);
  show('trGeneralFormattingSection', fHasSongs);
  show('trSearch', fHasSongs || cSongSets > 0);
}

// projector

g.iNextProjector = 1;
function openProjector(event) {
  window.open(`./projector.html?id=${g.iNextProjector++}`, '_blank');
}

// Song, Song Set and review navigation for Printing or Projecting

g.nav = {};
g.nav.iSongInSet = 0;
g.nav.iPageInSong = 0;
g.nav.iPageInReview = 0;
g.nav.fBlankScreen = true;
g.nav.iPageInReview = 0;

function getNavState() {
  let nav = {};
  if (ge('chkNavSongSetMode').checked) {
    nav.mode = 'songSet';
    // UI drives songSetName
    nav.songSetName = ge('selNavSongSets').value;
    if (!nav.songSetName) {
      // no songSet selected, switch to song mode.
      ge('chkNavSongMode').checked = 'checked';
      return getNavState();
    }
    // g.nav.iSongInSet drives songName
    const aSongsInSet = songLibrary.oSongSets[nav.songSetName];
    nav.cSongsInSet = aSongsInSet.length;
    nav.aSongsInSet = aSongsInSet;
    nav.iSongInSet = g.nav.iSongInSet;
    console.assert(nav.iSongInSet >= 0);
    // console.assert(nav.iSongInSet < nav.cSongsInSet);
    nav.songName = songLibrary.oSongSets[nav.songSetName][nav.iSongInSet];
    nav = addNavSongState(nav);

  } else if (ge('chkNavSongMode').checked) {
    nav.mode = 'song';
    nav.songSetName = '';
    nav.songName = ge('selNavSongs').value;
    if (!nav.songName) {
      // no song selected, switch to review mode
      ge('chkReviewMode').checked = 'checked';
      return getNavState();
    }
    nav = addNavSongState(nav);

  } else if (ge('rdoReviewMode').checked) {
    nav.mode = 'review';
    nav.iPageInReview = g.nav.iPageInReview;
    nav.aSongPagePairs = getSongPagePairs();
    nav.cPagesInReview = nav.aSongPagePairs.length;
    nav.songName = nav.aSongPagePairs[g.nav.iPageInReview][0];
    nav = addNavSongState(nav);
    nav.pageName = nav.aSongPagePairs[g.nav.iPageInReview][1];
    nav.iUniquePageInSong = 
      getIndexOfPageInCurrentSongInReview(
        nav.songData, 
        nav.aSongPagePairs[g.nav.iPageInReview][1]);
    nav.cUniquePagesInSong = Object.keys(nav.songData.oPages).length;
    nav.iSongInReview = getAllSongNames().indexOf(nav.songName);
    nav.cSongsInReview = getAllSongNames().length;
    nav.fInReview = true;
  } else {
    // no mode selected, choose a default
    ge('chkNavSongSetMode').checked = 'checked';
    nav = getNavState();  // recurse
  }
  console.assert(nav.mode);

  //console.log('nav = ' + JSON.stringify(nav, null, 2));
  return nav;
}

function addNavSongState(nav) {
  nav.songData = songLibrary.oSongs[nav.songName];

  // g.nav.iPageInSong drives pageName
  nav.iPageInSong = g.nav.iPageInSong;
  console.assert(nav.iPageInSong >= 0);
  let aPagesInSong = [];
  if (nav.songData) {
    console.assert(Number.isInteger(nav.songData.RepeatCount));
    console.assert(nav.songData.RepeatCount > 0);
    for (let i = 0; i < nav.songData.RepeatCount; i++) {
      aPagesInSong = aPagesInSong.concat(nav.songData.aPageOrder);
    }
    if (nav.songData.TagPage) {
      aPagesInSong = aPagesInSong.concat([ nav.songData.TagPage ]);
    }
  }
  nav.cPagesInSong = aPagesInSong.length;
  nav.pageName = aPagesInSong[nav.iPageInSong];
  nav.aPagesInSong = aPagesInSong;
  // console.assert(nav.iPageInSong < nav.cPagesInSong);
  nav.fInReview = false;
  nav.fBlankScreen = g.nav.fBlankScreen;
  nav.showTitlePage = g.nav.showTitlePage;

  return nav;
}

async function onNavSongSetFilterChanged(event) {
  renderSongSetDropdown(
    'selNavSongSets',
    'txtNavSongSetFilter',
    '',
    'spnNoSongSets'
    )
}

async function onNavSongFilterChanged(event) {
  renderSongDropDown(
    'selNavSongs', 
    'txtNavSongFilter', 
    '', 
    'spnNoSongsDefined');
}

function onShowSong(event) {
  ge('chkNavSongMode').checked = true;
  onShowSongOrSongset();
}

function onShowSongSet(event) {
  ge('chkNavSongSetMode').checked = true;
  onShowSongOrSongset();  
}

function onShowSongOrSongset() {
  if (ge('chkNavSongMode').checked) {
    setNavSongUI(ge('selNavSongs').value);
  } else {
    setNavSongSetByName(ge('selNavSongSets').value);
  }
  renderNavSection();
}

function onModeChanged(event) {
  const nav = getNavState();
  show([
    'btnNavPrevSong',
    'btnNavPrevSongPage',
    'btnToggleShow',
    'btnNavNextSongPage',
    'btnNextSong'
    ], !nav.fInReview);
  show([
    'btnPrevReviewSong',
    'btnPrevReviewPage',
    'btnNextReviewPage',
    'btnNextReviewSong'
    ], nav.fInReview);
  g.nav.iPageInSong = 
  g.nav.iSongInSet = 0;
  // don't reset review page as we may have restored the saved review place.
  g.nav.fBlankScreen = true;
  renderNavSection();
}

function renderNavStateText() {
  const html = getNavStateTextHTML(getNavState());
  ge('divNavStateText').innerHTML = html;
}

function getNavStateTextHTML(nav) {
  let html = '';
  if (nav.mode == 'songSet') {
    html += (`Song Set: "<i>${nav.songSetName}</i>"<br>`).replace(/ /g, '&nbsp;');
  }

  let songPos = '';
  let cSongs = 0;
  let pagePos = '';
  let cPages = 0;
  let sTotalPages = '';
  if (nav.fInReview) {
    html += (`Reviewing: Song:<br><b>${getSongPagePairs()[nav.iPageInReview][0]}</b>`).replace(/ /g, '&nbsp;');
    cSongs = nav.cSongsInReview;
    songPos = `<b>${nav.iSongInReview + 1}</b> of ${nav.cSongsInReview}`;
  } else {
    html += (`Song:<b>${nav.songName}</b>`).replace(/ /g, '&nbsp;');
    if (nav.mode == 'songSet') {
      cSongs = nav.cSongsInSet;
      songPos = `${progressBar(nav.iSongInSet + 1, nav.cSongsInSet, false)} of ${nav.cSongsInSet}`;
    }
  }
  
  if (nav.mode != 'song') {
    html += `<br>song ${songPos}`;
  }

  html += '<br>';
  if (nav.fInReview) {
    pageName = nav.aSongPagePairs[nav.iPageInReview][1];
    if (g.nav.showTitlePage) {
      html += `Title Page:`;
    } else {
      html += `Page: "${pageName}"`;
    }

    cPages = nav.cUniquePagesInSong;
    pagePos = `${progressBar(nav.iUniquePageInSong + 1, nav.cUniquePagesInSong, false)}`;
    sTotalPages = `<br>unique pages in the song.<br>page ${nav.iPageInReview + 1} of ${nav.cPagesInReview} review pages.`
  } else { // !nav.fInReview
    let pageName = 
      (nav.songData.TagPage && (nav.iUniquePageInSong == nav.cUniquePagesInSong - 1)) 
      ?
      nav.songData.TagPage + ' {Tag}'
      :
      nav.pageName;
    if (g.nav.showTitlePage) {
      html += `Title Page:`;
    } else {
      html += `Page: "${pageName}"`;
    }

    html += ` (${g.nav.fBlankScreen ? 'hidden' : 'showing'})`;
    cPages = nav.cPagesInSong;
    if (cPages) {
      pagePos = progressBar(
        nav.showTitlePage ? 0 : Number(nav.iPageInSong) + 1, 
        nav.cPagesInSong, 
        songLibrary.defaults.generateTitle);
    } else {
      pagePos = 0;
    }
  }

  html += `<br>page ${pagePos} of ${cPages}${sTotalPages}`;

  return html;
}

function onPreviewKey(event) {
  if (processKeyCode(event.code)) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
  };
}

// returns fPreventDefault
function processKeyCode(code) {
  const nav = getNavState();
  let fHandled = true;
  console.log('Processing Key Code:' + code);
  switch (code) {
    case 'ArrowLeft':
      prevPage();
      break;

    case 'ArrowRight':
      nextPage();
      break;

    case 'ArrowUp':
      prevSong();
      break;

    case 'ArrowDown':
      nextSong();
      break;

    case 'Space':
      toggleBlankScreen();
      break;
    
    default:
      fHandled = false;
      break;
  }

  return fHandled;
}

function processARChanged(newAspectRatio) {
  if (songLibrary.defaults.aspectRatio != newAspectRatio) {
    songLibrary.defaults.aspectRatio = newAspectRatio;
    renderAspectRatioText();
    renderNavPagePreview();
  }
}

function renderSelectControl(
  idSel, 
  aOptionTexts, 
  selectedValue, 
  aOptionValues=aOptionTexts) {

  let htmlOptions = '';
  if (aOptionTexts && aOptionTexts.length) {
    aOptionTexts.forEach(
      (text, idx) => {
        htmlOptions += `<option value="${
          aOptionValues[idx]
        }"${
          selectedValue == aOptionValues[idx] ? ' selected': ''
        }>${
          text
        }</option>\n`;
      } 
    )
  }
  ge(idSel).innerHTML = htmlOptions;
  ge(idSel).value = htmlOptions ? selectedValue : null;
}

function enableNavButtons() {
  const nav = getNavState();
  if (nav.mode == 'review') {
    enableElement('btnPrevReviewSong', !isReviewingFirstSong());
    enableElement('btnNextReviewSong', !isReviewingLastSong())
    enableElement('btnPrevReviewPage', nav.iPageInReview > 0);
    enableElement('btnNextReviewPage', nav.iPageInReview < nav.cPagesInReview - 1);
  } else if (nav.mode == 'songSet') {
    const fSongsInSet = nav.cSongsInSet > 0;
    enableElement('btnNavPrevSong', fSongsInSet && nav.iSongInSet > 0);
    enableElement('btnNextSong', fSongsInSet && nav.iSongInSet < nav.cSongsInSet - 1);
    enableElement('btnNavPrevSongPage', fSongsInSet && !(nav.fBlankScreen && nav.iPageInSong == 0));
    enableElement('btnNavNextSongPage', 
      fSongsInSet && (
        nav.iPageInSong < nav.cPagesInSong - 1 || 
        nav.iSongInSet < nav.cSongsInSet - 1 ||
        (nav.iPageInSong == 0 && // special case for one page song
          nav.cPagesInSong == 1 && 
          (nav.fBlankScreen || nav.showTitlePage)
        )
      )
    );
  } else if (nav.mode == 'song') {
    enableElement('btnNavPrevSong', false);
    enableElement('btnNextSong', false);
    enableElement('btnNavPrevSongPage', !(nav.fBlankScreen && nav.iPageInSong == 0));
    enableElement('btnNavNextSongPage', (
        nav.iPageInSong < nav.cPagesInSong - 1 || 
        nav.iSongInSet < nav.cSongsInSet - 1 ||
        (nav.iPageInSong == 0 && // special case for one page song
          nav.cPagesInSong == 1 && 
          (nav.fBlankScreen || nav.showTitlePage)
        )
      )
    );    
  }
  show('btnPrevReviewSong', nav.fInReview);
  show('btnNavPrevSong', !nav.fInReview);
  show('btnPrevReviewPage', nav.fInReview);
  show('btnNextSong', !nav.fInReview);
  show('btnNextReviewPage', nav.fInReview);
  show('btnNavPrevSongPage', !nav.fInReview);
  show('btnNextReviewSong', nav.fInReview);
  show('btnNavNextSongPage', !nav.fInReview);
}

// navigation event handlers

function saveProjectorAspectRatio() {
  songLibrary.defaults.savedAspectRatio = 
    songLibrary.defaults.aspectRatio;
  renderAspectRatioText();
}

async function setPreviewFocus(event) {
  ge('tdPagePreview').focus();
}

function renderAspectRatioText() {
  ge('spnCurrentAspectRatio').innerText = 
    songLibrary.defaults.savedAspectRatio 
      ?
      songLibrary.defaults.aspectRatio
      :
      '';    
  ge('spnSavedAspectRatio').innerText = 
    songLibrary.defaults.savedAspectRatio 
      ?
      songLibrary.defaults.savedAspectRatio
      :
      '';
}

function restoreProjectorAspectRatio() {
  localStorage.setItem('set-aspectRatio', Number(songLibrary.defaults.savedAspectRatio));
  localStorage.removeItem('set-aspectRatio');
}

function blankScreen(event) {
  const nav = getNavState();
  g.nav.fBlankScreen = !nav.fInReview;
  console.log('blankScreen()');
  renderNavSection();
}

function renderNavSection() {
  if (getNavState().songData) {
    const oMsg = getMessageFromGlobals();
    localStorage.setItem('projector-message', JSON.stringify(oMsg));
    localStorage.removeItem('projector-message');
    renderNavPagePreview();
    renderNavStateText();
    enableNavButtons();
  }
}

function renderNavPagePreview() {
  const elHost = ge('tdPagePreview');
  
  const height = 300; //ge('tdPagePreview').clientHeight;
  let width = 
    songLibrary.defaults.aspectRatio 
    ? 
    fixit(height / songLibrary.defaults.aspectRatio, 0)
    : 
    300;
    
  const oMsg = getMessageFromGlobals();
  const nav = getNavState();
  if (g.nav.fBlankScreen && !nav.fInReview) {
    oMsg.content = '';
  }
  renderPageToHost(
    ge('tdPagePreview'), 
    oMsg,
    width, 
    height);
}

function toggleBlankScreen(event) {
  console.assert(!g.nav.fInReview);
  g.nav.fBlankScreen = !g.nav.fBlankScreen;
  console.log('toggleBlankScreen');
  renderNavSection();
}

function prevPage(event) {
  console.log('prevPage');
  if (getNavState().fInReview) {
    prevReviewPage();
  } else {
    prevSongPage();
  }
  renderNavSection();
}

function prevSongPage() {
  const nav = getNavState();
  console.log('prevSongPage()')
  console.assert(!g.nav.fInReview);
  if (g.nav.iPageInSong == 0) {
    if (!g.nav.showTitlePage) {
      g.nav.showTitlePage = songLibrary.defaults.generateTitle;
      if (g.nav.showTitlePage) {
        renderNavSection();
      } else {
        blankScreen();
      }
      return; // stay at page 0
    } else {
      g.nav.showTitlePage = false;
      blankScreen();
    }
  }
  if (g.nav.iPageInSong > 0) {
    if (g.nav.iPageInSong == nav.cPagesInSong - 1 &&
        g.nav.fBlankScreen) {
      g.nav.fBlankScreen = false;
    }
    g.nav.iPageInSong--;
  }
  renderNavSection();
}

function prevReviewPage() {
  const nav = getNavState();
  console.log('prevReviewPage()')
  console.assert(nav.fInReview);
  if (nav.iPageInReview > 0) {
    // note that the keyboard method of navigation can get here
    // despite the button being disabled
    g.nav.iPageInReview--;
    renderNavSection();
  }
}

function nextPage() {
  console.log('nextPage()');
  if (getNavState().fInReview) {
    nextReviewPage();
  } else {
    nextSongPage();
  }
}

function nextSongPage(event) {
  const nav = getNavState();
  console.log('nextSongPage()');
  let fAdvanceToNextSong = false;
  console.assert(!nav.fInReview);
  if (nav.iPageInSong < nav.cPagesInSong - 1 ||
      // not at the last page in the song
     (nav.iPageInSong == 0 && (g.nav.fBlankScreen || g.nav.showTitlePage))
      // at the title page
     ) {
    // advance the page.
    if (nav.iPageInSong == 0) {
      // we are either blank, showing the title or showing the first verse.
      if (nav.fBlankScreen) {
        // blank - show title or first verse if not showing titles.
        g.nav.fBlankScreen = false;
        g.nav.showTitlePage = songLibrary.defaults.generateTitle;
        // don't advance - show first page or title
      } else if (g.nav.showTitlePage) {
        // we are showing the title page
        g.nav.showTitlePage = false;
        // don't advance - show first page
      } else if (nav.iPageInSong < nav.cPagesInSong - 1) {
        // just advance
        g.nav.iPageInSong++;
      }
    } else if (nav.iPageInSong < nav.cPagesInSong - 1) {
      // we are showing the second or next to last verse - advance
      g.nav.iPageInSong++;
    } else {
      // last page showing
      fAdvanceToNextSong = true;
    }
  } else {
    fAdvanceToNextSong = true;
  }
  
  if (fAdvanceToNextSong) {
    if (nav.iSongInSet < nav.cSongsInSet - 1) {
    nextSongInSet()
    } else {
      blankScreen();
    }
  }
  renderNavSection();
}

function prevSong(event) {
  const nav = getNavState();
  console.log('prevSong()');
  if (nav.fInReview) {
    prevReviewSong();
  } else {
    prevSongInSet();
  }
}

function prevSongInSet() {
  const nav = getNavState();
  console.log('prevSongInSet()');
  if (nav.iSongInSet > 0) {
    // the keyboard
    nav.iSongInSet--;
    setNavSongSetSongIndex(nav.iSongInSet);
    renderNavSection();
  }
}

function prevReviewSong(event) {
  const nav = getNavState();
  console.log('prevReviewSong()');
  console.assert(nav.fInReview);
  if (!isReviewingFirstSong()) {
    // note that the keyboard method can get here
    // despite the button being disabled.
    const aSongPagePairs = getSongPagePairs();
    const startingSongName = aSongPagePairs[nav.iPageInReview][0];
    while (nav.iPageInReview > 0 && 
           startingSongName == aSongPagePairs[nav.iPageInReview][0]) {
      nav.iPageInReview--;
    }
    // now go to the first page of the current song
    const currentSongName = aSongPagePairs[nav.iPageInReview][0];
    while (nav.iPageInReview > 0 && 
           currentSongName == aSongPagePairs[nav.iPageInReview][0]) {
      nav.iPageInReview--;
    }
    if (currentSongName != aSongPagePairs[nav.iPageInReview][0]) { 
      // only bump to the next song if we are not at 0
      nav.iPageInReview++;
    }
    g.nav.iPageInReview = nav.iPageInReview;
    renderNavSection();
  }
}

function nextSong() {
  console.log('nextSong()');
  if (getNavState().fInReview) {
    nextReviewSong();
  } else {
    nextSongInSet();
  }
}

function nextSongInSet(event) {
  const nav = getNavState();
  console.log('nextSongInSet()');
  console.assert(!nav.fInReview);
  if (nav.iSongInSet < nav.cSongsInSet - 1) {
    // the keyboard method can get us here despite
    // the button being disabled.
    setNavSongSetSongIndex(nav.iSongInSet + 1);
    blankScreen();  
  }
}

function setNavSongSetByName(songSetName) {
  const nav = getNavState();
  console.log(`setNavSongSetByName(${songSetName})`);
  console.assert(nav.mode == 'songSet');
  console.assert(Object.keys(songLibrary.oSongSets).includes(songSetName));
  ge('selNavSongSets').value = songSetName;
  setNavSongSetSongIndex(0);
}

function setNavSongSetSongIndex(iSongInSet) {
  console.log(`setNavSongSetSongIndex(${iSongInSet})`);
  setNavPage(0);
  g.nav.iSongInSet = iSongInSet;
}

function setNavSongUI(songName) {
  console.log(`setNavSongUI(${songName})`);
  ge('selNavSongs').value = songName; 
  setNavPage(0);
}

function setNavPage(iPage) {
  const nav = getNavState();
  console.log(`setNavPage(${iPage})`);
  if (nav.fInReview) {
    if (iPage < 0 || iPage >= nav.cPagesInReview) {
      iPage = 0;
      g.nav.iPageInSong = iPage;
      return;
    }
  } else {
    if (iPage < 0 || iPage >= nav.cPagesInSong) {
      iPage = 0;
      blankScreen();
      g.nav.iPageInSong = 0;
      if (iPage >= nav.cPagesInSong) {
        if (nav.mode == 'songSet') {
          setNavSongSetSongIndex(nav.iSongInSet + 1);
        }
      }
    } else {
      g.nav.fBlankScreen = !nav.fInReview;
      g.nav.iPageInSong = iPage;
    }
    renderNavSection();
  }
}

function calcSongPageCount(songData) {
  if (!songData) {
    return 0;
  }
  let cPagesInSong = songData.aPageOrder.length * songData.RepeatCount;
  if (songData.TagPage) {
    cPagesInSong++;
  }
  return cPagesInSong;
}

// review navigation utilities

function nextReviewPage() {
  const nav = getNavState();
  console.log('nextReviewPage()');
  console.assert(nav.fInReview);
  console.assert(nav.aSongPagePairs.length);
  if (nav.iPageInReview < nav.aSongPagePairs.length - 1) {
    // note that the keyboard method can get here despite
    // the fact that the button is disabled
    g.nav.iPageInReview++;
    renderNavSection();
  }
}

function nextReviewSong(event) {
  const nav = getNavState();
  console.log('nextReviewSong()');
  console.assert(nav.fInReview);
  if (nav.iSongInReview < nav.cSongsInReview - 1) {
    // the keyboard method can get here despite
    // the button being disabled
    const currentSongName = nav.aSongPagePairs[nav.iPageInReview][0];
    while (g.nav.iPageInReview < nav.cPagesInReview - 1 && 
           nav.aSongPagePairs[g.nav.iPageInReview][0] == currentSongName) {
      g.nav.iPageInReview++;
    }
    renderNavSection();
  }
}

function resetReview(event) {
  console.log('resetReview()');
  ge('rdoReviewMode').checked = 'checked';
  g.nav.iPageInReview = 0;
  g.nav.iSongInReview = 0;
  onModeChanged();
  ge('divReviewStatus').innerText = 'The Review has been restarted.';
  setTimeout(() => {
    ge('divReviewStatus').innerText = '';
  }, 2000);
}

function saveReviewPlace(event) {
  songLibrary.defaults.lastReviewPage = g.nav.iPageInReview;
  ge('divReviewStatus').innerText = 'Review spot successfully saved.';
  setTimeout(() => {
    ge('divReviewStatus').innerText = '';
  }, 2000);
}

function recallReviewPlace(event) {
  if (!Number.isNaN(songLibrary.defaults.lastReviewPage)) {
    g.nav.iPageInReview = songLibrary.defaults.lastReviewPage;
    ge('divReviewStatus').innerText = 'Review spot successfully recalled.';
    ge('rdoReviewMode').checked = 'checked';
    onModeChanged();
  } else {
    ge('divReviewStatus').innerText = 'No Review spot was successfully recalled.';
  }
  setTimeout(() => {
    ge('divReviewStatus').innerText = '';
  }, 2000);
}

function getSongPagePairs() {
  const aSongPagePairs = [];
  Object.entries(songLibrary.oSongs).sort().forEach(
    function(aKVSong) {
      Object.entries(aKVSong[1].oPages).sort().forEach(
        function(aKVPage) {
          aSongPagePairs.push([ aKVSong[0], aKVPage[0]]);
        }
      )
    }
  )
  return aSongPagePairs;
}

function isReviewingFirstSong() {
  const nav = getNavState();
  console.assert(nav.fInReview);
  return nav.aSongPagePairs[nav.iPageInReview][0] == 
    nav.aSongPagePairs[0][0];
}

function isReviewingLastSong() {
  const nav = getNavState();
  console.assert(nav.fInReview);
  return nav.aSongPagePairs[nav.iPageInReview][0] == 
    nav.aSongPagePairs[nav.aSongPagePairs.length - 1][0];
}

function getMessageFromGlobals() {
  const nav = getNavState();
  let oMsg = {};
  if (nav.fInReview) {
    const songName = nav.aSongPagePairs[nav.iPageInReview][0];
    const songData = songLibrary.oSongs[songName];
    oMsg = {
      fontSize: songData.fontSize,
      fontBoldness: songData.fontBoldness,
      lineHeight: songData.lineHeight,
      content: songData.oPages[nav.pageName],
      allCaps: songLibrary.defaults.allCaps,
      license: songData.License ? songData.License : songLibrary.defaults.License,
      pageNumber: nav.iUniquePageInSong + 1,
      cPagesInSong: nav.cUniquePagesInSong,
      songNumber: nav.iSongInReview + 1,
      cSongsInSet: nav.cSongsInReview,
    }
  } else { // !nav.fInReview
    oMsg = {
      fontSize: nav.songData.fontSize,
      fontBoldness: nav.songData.fontBoldness,
      lineHeight: nav.songData.lineHeight,
      allCaps: songLibrary.defaults.allCaps,
      license: nav.songData.License ? nav.songData.License : songLibrary.defaults.License,
      pageNumber: (nav.iPageInSong == 0 && (nav.fBlankScreen || nav.showTitlePage))
        ? 0 : nav.iPageInSong + 1,
      cPagesInSong: nav.cPagesInSong,
      songNumber: nav.iSongInSet + 1,
      cSongsInSet: nav.mode == 'song' ? 0 : nav.cSongsInSet,
      content: nav.fBlankScreen ? '' : nav.songData.oPages[nav.pageName],
    }
    if (g.nav.fBlankScreen) {
      oMsg.content = '';
    } else if (g.nav.showTitlePage) {
      oMsg.content = `<span style="color: lightblue;">${
        removeVersion(nav.songName)
        }</span><br><span class="pageTitle">${
          nav.songData.TitleNote
        }</span>`;
    }
  }
  return oMsg;
}

// General formatting

function onAllCapsChanged(event) {
  songLibrary.defaults.allCaps = event.srcElement.checked ? 1 : 0;
  renderNavSection();
}

function onGenerateTitlePagesChanged(event) {
  songLibrary.defaults.generateTitle = !!ge('chkGenerateTitles').checked;
  if (g.nav.showTitlePage) {
    g.nav.showTitlePage = songLibrary.defaults.generateTitle;
  }
  renderNavSection();
}

function removeVersion(str) {
  // str may have a trailing "(...)" which is the song version which
  // we remove for the title page.
  return str.replace(/\s*\(.*\)$/, '');
}

// Song formatting
function biggerFont(event) {
  const nav = getNavState();
  nav.songData.fontSize = fixit(nav.songData.fontSize * 1.1, 3)
  renderNavSection();
}

function smallerFont(event) {
  const nav = getNavState();
  nav.songData.fontSize = fixit(nav.songData.fontSize * .9, 3);
  renderNavSection();
}

function biggerLineHeight(event) {
  const nav = getNavState();
  nav.songData.lineHeight = nav.songData.lineHeight * 1.05;
  renderNavSection();
}

function smallerLineHeight(event) {
  const nav = getNavState();
  nav.songData.lineHeight = nav.songData.lineHeight * .95;
  renderNavSection();
}

function bolderFont(event) {
  const nav = getNavState();
  if (nav.songData.fontBoldness < 9) {
    nav.songData.fontBoldness++;
    renderNavSection();
  }
}

function lessBoldFont(event) {
  const nav = getNavState();
  if (nav.songData.fontBoldness > 1) {
    nav.songData.fontBoldness--;
    renderNavSection();
  }
}

// song set editing


// --- Song Editing Functions ---

function setNewSongError(err) {
  ge('divNewEditSongNameError').innerText = err;
}

function initSongSetEditUI() {
  renderSongDropDown(
    'selAllSongsToEdit', 
    'txtEditSongFilter', 
    '', 
    'divNewEditSongNameError');
  ge('txtNewEditSongName').value = '';

  enableSongSetEditButtons();
}

function setSongSetError(text) {
  ge('divSongSetError').innerText = text;
}

g.prevEditSongSetFilter = '';
function getSongSetEditState() {
  const sses = {};
  sses.songSetNameToEdit = ge('selAllSongSetsToEdit').value;
  sses.newSongSetName = ge('txtNewSongSetName').value.trim();
  sses.songNameToAdd = ge('selSongsToAddToSet').value;
  sses.aSongList = songLibrary.oSongSets[sses.songSetNameToEdit];
  if (!sses.aSongList) {
    sses.aSongList = [];
  }
  sses.songSetFilter = ge('txtSongSetAddSongFilter').value.trim();
  sses.prevSongSetFilter = g.prevEditSongSetFilter;
  sses.cSongSets = getAllSongSetNames().length;
  g.prevEditSongSetFilter = sses.songSetFilter;
  sses.selectedSongInSet = ge('selCurrentSongSet').value;
  sses.aSongsInSongSet = songLibrary.oSongSets[sses.songSetNameToEdit];
  if (!sses.aSongsInSongSet) {
    sses.aSongsInSongSet = [];
  }
  if (sses.selectedSongInSet) {
    sses.iSelectedSongInSet = 
      sses.aSongsInSongSet.indexOf(sses.selectedSongInSet);  
  } else {
    sses.iSelectedSongInSet = -1;
  }

  return sses;
}

function enableSongSetEditButtons() {
  const sses = getSongSetEditState();
  show('selAllSongSetsToEdit', !!sses.songSetNameToEdit);
  show('spnNoSongSetsToEdit', !sses.cSongSets);
  enableElement('btnDeleteSongSet', !!sses.songSetNameToEdit);
  enableElement('btnCreateNewSongSet', !!sses.newSongSetName);
  enableElement('btnCopySongSet', 
    !!sses.newSongSetName && !!sses.songSetNameToEdit)
  enableElement('btnRenameSongSet', 
    !!sses.newSongSetName && !!sses.songSetNameToEdit);
  show('spnNoSongsInEditSongSet', !sses.aSongList.length);
  show('selCurrentSongSet', !!sses.aSongList.length);
  enableElement('btnAddSongToNewSongSet', !!sses.songNameToAdd);
  enableElement('btnMoveSongUpInSongSet', 
    sses.aSongsInSongSet.length > 1 &&
    sses.iSelectedSongInSet > 0);
  enableElement(
    'btnMoveSongDownInSongSet', 
    sses.aSongsInSongSet.length > 1 &&
    sses.iSelectedSongInSet != -1 &&
    sses.iSelectedSongInSet < (sses.aSongsInSongSet.length - 1));
  enableElement('btnDeleteSongFromSongSet', 
    !!sses.selectedSongInSet);
}

function onSelCurrentSongSetChanged() {
  getSongSetEditState();
}

function editSelectedSongSet(event) {
  ge('txtNewSongSetName').value = '';
  const sses = getSongSetEditState();
  renderSelectControl(
    'selCurrentSongSet', 
    sses.aSongList, 
    sses.aSongList[0]);
}

function onNewSongSetEditNameChanged(event) {
  getSongSetEditState();
}

function onSelCurrentSongSetChanged() {
  enableSongSetEditButtons();
}

function onEditSelectedSongInSet(event) {
  const songName = ge('selCurrentSongSet').value;
  if (songName) {
    editSong(songName);
  }
}

function deleteSongSet(event) {
  const songSetToDelete = ge('selAllSongSetsToEdit').value;
  if (getAllSongSetNames().includes(songSetToDelete)) {
    delete songLibrary.oSongSets[songSetToDelete];
    getSongSetEditState();
    renderSongSetDropdown(
      'selAllSongSetsToEdit', 
      'txtSongSetEditFilter',
      '',
      'spnNoSongSetsToEdit');
  }
  checkForEmptySongsOrSongSets();
}

function createNewSongSet(event) {
  const sses = getSongSetEditState();
  songLibrary.oSongSets[sses.newSongSetName] = [];
  renderSongSetDropdown(
    'selAllSongSetsToEdit', 
    'txtSongSetEditFilter', 
    sses.newSongSetName,
    'spnNoSongSetsToEdit');
  renderSongSetDropdown(
    'selNavSongSets', 
    'txtNavSongSetFilter', 
    ge('selNavSongSets').value,
    'spnNoSongSetsToEdit');
  editSelectedSongSet();
  checkForEmptySongsOrSongSets();
}

function copySongSet(event) {
  const sses = getSongSetEditState();
  console.assert(sses.newSongSetName, 'UI should not allow this');
  if (sses.newSongSetName == sses.songSetNameToEdit) {
    setSongSetError('You cannot copy a song set to itself.  Choose a different name for the new song set.');
    return;
  }
  if (getAllSongSetNames().includes(sses.newSongSetName)) {
    setSongSetError('You cannot copy a song set to an already existing song set.  Delete the existing song set first if you want to do this.');
    return;    
  }
  songLibrary.oSongSets[sses.newSongSetName] = songLibrary.oSongSets[sses.songSetNameToEdit].map((e) => e);;
  renderSongSetDropdown(
    'selAllSongSetsToEdit', 
    'txtSongSetEditFilter', 
    sses.newSongSetName,
    'spnNoSongSetsToEdit');
  ge('txtNewSongSetName').value = '';

  let selectedNavSongSetName = ge('selNavSongSets').value;
  if (selectedNavSongSetName == sses.songSetNameToEdit) {
    selectedNavSongSetName = sses.newSongSetName;
  }
  renderSongSetDropdown(
    'selNavSongSets', 
    'txtNavSongSetFilter', 
    selectedNavSongSetName,
    'spnNoSongSets');

  editSelectedSongSet();  
}

function renameSongSet(event) {
  const sses = getSongSetEditState();
  console.assert(sses.newSongSetName, 'UI should not allow this');
  if (sses.newSongSetName == sses.songSetNameToEdit) {
    setSongSetError('No action taken. New song name matches selected one.');
    return;
  }
  if (getAllSongSetNames().includes(sses.newSongSetName)) {
    setSongSetError('You cannot rename a song set to the same name as an existing song set.');
    return;    
  }  
  songLibrary.oSongSets[sses.newSongSetName] = songLibrary.oSongSets[sses.songSetNameToEdit];
  delete songLibrary.oSongSets[sses.songSetNameToEdit];
  renderSongSetDropdown(
    'selAllSongSetsToEdit', 
    'txtSongSetEditFilter', 
    sses.newSongSetName,
    'spnNoSongSetsToEdit');
  ge('txtNewSongSetName').value = '';

  let selectedNavSongSetName = ge('selNavSongSets').value;
  if (selectedNavSongSetName == sses.songSetNameToEdit) {
    selectedNavSongSetName = sses.newSongSetName;
  }
  renderSongSetDropdown(
    'selNavSongSets', 
    'txtNavSongSetFilter', 
    selectedNavSongSetName,
    'spnNoSongSets');

  editSelectedSongSet();
}

async function onSongSetEditFilterChanged(event) {
  renderSongSetDropdown(
    'selAllSongSetsToEdit',
    'txtSongSetEditFilter',
    '',
    'spnNoSongSetsToEdit');
}

async function onEditSongInSetFilterChanged(event) {
  renderSongDropDown(
    'selSongsToAddToSet', 
    'txtSongSetAddSongFilter',
    '',
    'spnNoSongsToAddToSongSet');
  fillSongToEdit();
}

function onNewSongSetEditNameChanged(event) {
  enableSongSetEditButtons();
}

function addSongToSongSet(event) {
  const sses = getSongSetEditState();
  console.assert(sses.songNameToAdd, 'UI should not let this happen.');
  if (sses.aSongList.includes(sses.songNameToAdd)) {
    setSongSetError('That song is already in your list.');
  } else {
    sses.aSongList.splice(sses.iSelectedSongInSet + 1, 0, sses.songNameToAdd);
    renderSelectControl(
      'selCurrentSongSet',
      sses.aSongList, 
      sses.songNameToAdd);
    fillSongToEdit();
    enableSongSetEditButtons();
    checkForEmptySongsOrSongSets();
  }
}

async function moveSongUpInSongSet(event) {
  const sses = getSongSetEditState();
  console.assert(sses.iSelectedSongInSet > 0);
  const T = sses.aSongsInSongSet[sses.iSelectedSongInSet];
  sses.aSongsInSongSet[sses.iSelectedSongInSet] = 
    sses.aSongsInSongSet[sses.iSelectedSongInSet - 1];
  sses.aSongsInSongSet[sses.iSelectedSongInSet - 1] = T;
  getSongSetEditState();
  renderSelectControl(
    'selCurrentSongSet',
    sses.aSongsInSongSet, 
    T);
  enableSongSetEditButtons();
}

function moveSongDownInSongSet(event) {
  const sses = getSongSetEditState();
  console.assert(sses.iSelectedSongInSet < sses.aSongList.length - 1);
  const T = sses.aSongsInSongSet[sses.iSelectedSongInSet];
  sses.aSongsInSongSet[sses.iSelectedSongInSet] = 
    sses.aSongsInSongSet[sses.iSelectedSongInSet + 1];
  sses.aSongsInSongSet[sses.iSelectedSongInSet + 1] = T;
  getSongSetEditState();
  renderSelectControl(
    'selCurrentSongSet',
    sses.aSongsInSongSet, 
    T);
  enableSongSetEditButtons();
}

function deleteSongFromSongSet(event) {
  const sses = getSongSetEditState();
  sses.aSongsInSongSet.splice(sses.iSelectedSongInSet, 1);
  renderSelectControl(
    'selCurrentSongSet', 
    sses.aSongsInSongSet);
  editSelectedSongSet();
  checkForEmptySongsOrSongSets();
  enableSongSetEditButtons();
}

// Edit or Create a Song

function initSongEditUI() {
  setNewSongEditError('');
  fillSongToEdit();
}

function onEditSongSelectChanged(fClearSongName=true) {
  if (fClearSongName) {
    ge('txtNewEditSongName').value = '';
  }
  fillSongToEdit();
}

function enterSongVariant(idSel) {
  const elSel = ge(idSel);
  ge('txtNewEditSongName').value = elSel.value + ' (variant)';
  onEditSongSelectChanged(false);
}

function copySelectedSongToNewName(event) {
  ge('txtNewEditSongName').value = ge('selAllSongsToEdit').value;
  onEditSongSelectChanged(false);
}

function fillSongToEdit(event) {
  const ses = getSongEditState();
  setSongVerseError('');

  // fill in all edit fields related to the selected song
  const newSongName = ge('selSongVersesToEdit').value;
  renderSelectControl(
    'selSongVersesToEdit',
    ses.aPageNames, 
    newSongName ? 
      newSongName :
      ses.aPageNames[0]);
  onSelectedVerseToEditChanged(null, ses);

  // other settings
  if (ses.songData) {
    const sd = ses.songData;
    ge('txtNotes').value = 
      sd.Notes ? sd.Notes : '';
    ge('txtTitleNote').value = 
      sd.TitleNote ? sd.TitleNote : '';
    ge('txtAuthor').value = 
      sd.Author ? sd.Author : '';
    ge('txtPublisher').value = 
      sd.Publisher ? sd.Publisher : '';
    ge('txtLicense').value = 
      sd.License ? sd.License : '';
    ge('txtDefaultLicense').value = songLibrary.defaults.License;
    ge('txtSongBookTitle').value = songLibrary.defaults.songBookTitle;
    ge('selRepeatCount').value = 
      sd.RepeatCount ? sd.RepeatCount : 1;
  } else {
    ge('txtNotes').value = '';
    ge('txtTitleNote').value = '';
    ge('txtAuthor').value = '';
    ge('txtPublisher').value = '';
    ge('txtLicense').value = '';
    ge('txtDefaultLicense').value = songLibrary.defaults.License;
    ge('txtSongBookTitle').value = songLibrary.defaults.songBookTitle;
    ge('selRepeatCount').value = 1;
  }

  const fShowDetails = !ses.newSongEditName;
  show('fsOtherSongSettings', fShowDetails);
  show('fsEditSongVerses', fShowDetails);
  if (fShowDetails) {
    ge('txtNewEditSongName').value = '';
  }

  enableSongEditButtons();
}

function onRepeatCountChanged(event) {
  const ses = getSongEditState();
  ses.songData.RepeatCount = Number(ge('selRepeatCount').value);
  renderOverallOrderText();
}

function onNotesChanged(event) {
  const ses = getSongEditState();
  ses.songData.Notes = ge('txtNotes').value.trim();
}

function onTitleNoteChanged(event) {
  const ses = getSongEditState();
  ses.songData.TitleNote = ge('txtTitleNote').value.trim();
}

function onAuthorChanged(event) {
  const ses = getSongEditState();
  ses.songData.Author = ge('txtAuthor').value.trim();
}

function onPublisherChanged(event) {
  const ses = getSongEditState();
  ses.songData.Publisher = ge('txtPublisher').value.trim();
}

function onLicenseChanged(event) {
  const ses = getSongEditState();
  ses.songData.License = ge('txtLicense').value;
}

function onDefaultLicenseChanged(event) {
  songLibrary.defaults.License = ge('txtDefaultLicense').value.trim();  
}

function onSongBookTitleChanged(event) {
  songLibrary.defaults.songBookTitle = ge('txtSongBookTitle').value.trim();
}

function setNewSongEditError(text) {
  ge('divNewEditSongNameError').value = text;
}

function onNewSongNameChanged(event) {
  onEditSongSelectChanged(false);
  enableSongEditButtons();
}

function onNewSongFilterChanged(event) {
  const cSongs = renderSongDropDown(
    'selAllSongsToEdit', 
    'txtEditSongFilter', 
    '', 
    'divNewEditSongNameError');
  if (cSongs == 1) {
    fillSongToEdit();
  }
}

function getSongEditState() {
  const ses = {};
  ses.selectedSongToEdit = ge('selAllSongsToEdit').value;
  ses.fExistingSong = ses.selectedSongToEdit ? 1 : 0;
  if (ses.selectedSongToEdit) {
    ses.songData = songLibrary.oSongs[ses.selectedSongToEdit];
    console.assert(ses.songData);
    ses.aPageOrder = ses.songData.aPageOrder;
    ses.oPages = ses.songData.oPages;
    ses.aPageNames = Object.keys(ses.oPages).sort();
    ses.selectedOrderVerseIdx = Number(ge('selSongVerseOrder').value);
    ses.selectedOrderVerseName = ses.aPageOrder[ses.selectedOrderVerseIdx];
  }
  ses.newSongEditName = ge('txtNewEditSongName').value.trim();
  ses.pageName = ge('selSongVersesToEdit').value;
  ses.fIsTagVerse = ge('chkIsTagVerse').checked ? 1 : 0;
  ses.newVerseName = ge('txtNewVerseName').value.trim();
  return ses;
}

function doesProposedEditSongNameExist(newSongEditName) {
  const name = newSongEditName.toLocaleLowerCase();
  const songNameFound = getAllSongNames().find(
    function (thisSongName) {
      return thisSongName.toLocaleLowerCase() == name;
    } 
  )

  return !!songNameFound;
}

function enableSongEditButtons() {
  const ses = getSongEditState();
  hide('divNewEditSongNameError');

  // disable editing fieldsets if the song edit mode is active
  enableElement('fsEditSongVerses', ses.fExistingSong);
  enableElement('fsEditSongVerseOrder', ses.fExistingSong);
  enableElement('fsOtherSongSettings', ses.fExistingSong);

  // New song edit buttons
  const fNewSongNameAlreadyExists = 
    doesProposedEditSongNameExist(ses.newSongEditName);
  if (fNewSongNameAlreadyExists) {
    // tell user this song name already exists
    // which means we can't rename it or create a new song.
    show('divNewEditSongNameError');
    ge('divNewEditSongNameError').innerText = 
      `The song "${ses.newSongEditName}" already exists.`;
  }

  enableElement('btnCreateNewSong', 
    ses.newSongEditName &&
    !fNewSongNameAlreadyExists &&
    ses.newSongEditName != ses.selectedSongToEdit
  );

  enableElement('btnRenameSong',
    ses.fExistingSong && 
    ses.newSongEditName &&
    !fNewSongNameAlreadyExists &&
    ses.newSongEditName != ses.selectedSongToEdit);

  enableElement('btnCopySong',
    ses.fExistingSong && 
    ses.newSongEditName &&
    !fNewSongNameAlreadyExists &&
    ses.newSongEditName != ses.selectedSongToEdit);    

  enableElement('btnDeleteSong', 
    ses.fExistingSong);

  enableSongEditVerseButtons(ses);
}

function createNewSong(event) {
  const ses = getSongEditState();
  const sExistingSongName = 
    doesProposedEditSongNameExist(ses.newSongEditName);
  if (sExistingSongName) {
    setNewSongEditError(`The new song name you entered looks a lot like "${
      newSongEditName
      }" which already exists.`);
    return;
  }
  const d = songLibrary.defaults;
  songLibrary.oSongs[ses.newSongEditName] = {
    oPages: {},
    aPageOrder: [],
    RepeatCount: 1,
    fontSize: d.fontSize,
    fontBoldness: d.fontBoldness,
    lineHeight: d.lineHeight,
    license: ''
  };
  reRenderAllSongSelectControls();
  ge('txtEditSongFilter').value = '';
  ge('txtNewEditSongName').value = '';
  onNewSongFilterChanged();
  ge('selAllSongsToEdit').value = ses.newSongEditName;
  initSongValues(ses.newSongEditName);
  fillSongToEdit();
  ge('txtaVerseLines').value = '';
  enableSongSetEditButtons();
  checkForEmptySongsOrSongSets();
}

function clearSongUI(event) {
  ge('selSongVersesToEdit').innerHTML = '';
  ge('txtaVerseLines').value = '';
  ge('selRepeatCount').value = 1;
  ge('selSongVerseOrder').innerHTML = '';
    // other settings
  ge('txtNotes').value = '';
  ge('txtTitleNote').value = '';
  ge('txtAuthor').value = '';
  ge('txtPublisher').value = '';
  ge('txtLicense').value = '';
  ge('txtDefaultLicense').value = '';
  ge('selRepeatCount').value = '';
}

function renameSong(event) {
  const ses = getSongEditState();
  const oldSongName = ses.selectedSongToEdit;
  const newSongName = ses.newSongEditName;
  console.assert(oldSongName, 'UI should not allow this to fail');
  if (newSongName != oldSongName) {
    songLibrary.oSongs[newSongName] = songLibrary.oSongs[oldSongName];
    delete songLibrary.oSongs[oldSongName];

    // fix any song sets that reference the renamed song
    Object.entries(songLibrary.oSongSets).forEach(
      function (aKVSongSet) {
        aKVSongSet[1].forEach(
          function (songName, iSongInSet) {
            if (songName == oldSongName) {
              aKVSongSet[1][iSongInSet] = newSongName;
            }
          }
        )
      }
    )

    ge('txtNewEditSongName').value = '';
    reRenderAllSongSelectControls(oldSongName, newSongName);
    fillSongToEdit();
  }
}

function copySong(event) {
  const ses = getSongEditState();
  const oldSongName = ses.selectedSongToEdit;
  const newSongName = ses.newSongEditName;
  console.assert(oldSongName, 'UI should not allow this to fail');
  if (songLibrary.oSongs[newSongName]) {
    setNewSongError('The new song name must be unique to copy this song into.');
    return;
  }
  if (newSongName != oldSongName) {
    ge('txtNewEditSongName').value = '';
    songLibrary.oSongs[newSongName] = 
      JSON.parse(JSON.stringify(songLibrary.oSongs[oldSongName]));
    reRenderAllSongSelectControls(oldSongName, newSongName);
    fillSongToEdit();
  }
}

function reRenderAllSongSelectControls(oldSongName, newSongName) {
  const fRename = 
    oldSongName && newSongName && oldSongName != newSongName;
  const fDelete = !oldSongName && !newSongName;

  let selectedNavSong = '';
  if (fRename) {
    selectedNavSong = fDelete ? '' : ge('selNavSongs').value;
  }
  renderSongDropDown(
    'selNavSongs', 
    'txtNavSongFilter', 
    selectedNavSong,
    'spnNoSongsDefined');


  let selectedEditSong = fDelete ? '' : ge('selSongsToAddToSet').value;
  if (fRename) {
    selectedEditSong = newSongName;
  }
  renderSongDropDown(
    'selSongsToAddToSet', 
    'txtSongSetAddSongFilter', 
    selectedEditSong,
    'spnNoSongsToAddToSongSet');


  let selectedAllSongsToEdit = fDelete ? '' : ge('selAllSongsToEdit').value;
  if (fRename) {
    selectedAllSongsToEdit = newSongName;
  }
  renderSongDropDown(
    'selAllSongsToEdit', 
    'txtEditSongFilter', 
    selectedAllSongsToEdit,
    'divNewEditSongNameError');
}

function deleteSong(event) {
  const ses = getSongEditState();
  delete songLibrary.oSongs[ses.selectedSongToEdit];

  // fix any song sets that reference the renamed song
  Object.entries(songLibrary.oSongSets).forEach(
    function(aKVSongSet) {
      aKVSongSet[1].forEach(
        function(songName, iSongInSet) {
          if (songName == ses.selectedSongToEdit) {
            delete aKVSongSet[1][iSongInSet];
          }
        }
      )
    }
  )

  // call this with no params to indicate a song was deleted 
  // this makes the song dropdowns select the first song.
  reRenderAllSongSelectControls();
  initSongEditUI();
  enableSongSetEditButtons();
  checkForEmptySongsOrSongSets();
}
 
// edit song verses

function setSongVerseError(text) {
  ge('divVerseNameEditError').innerText = text;
}

function enableSongEditVerseButtons(ses) {
  if (!ses) {
    ses = getSongEditState();
  }

  // edit song verses buttons
  enableElement('btnAddNewVerse', ses.newVerseName);
  enableElement('btnRenameSelectedVerse',
    ses.newVerseName && 
    ses.pageName);
  enableElement('btnDeleteSelectedVerse',
    ses.pageName);

  // enable lyric control only if a verse is selected
  ge('txtaVerseLines').value = 
    ses.songData && ses.songData.oPages[ses.pageName] 
      ?
      ses.songData.oPages[ses.pageName].join('\n') 
      :
      '';
  enableElement('txtaVerseLines', !!ge('selSongVersesToEdit').value);

  // verse order buttons
  if (undefined != ses.selectedOrderVerseIdx) {
    enableElement('btnMoveSelectedVerseUp',
      ses.selectedOrderVerseIdx > 0);
    enableElement('btnMoveSelectedVerseDown',
      ses.selectedOrderVerseIdx < ses.aPageOrder.length - 1);
    enableElement('btnAddSelectedVerseToVerseOrder',
      ses.pageName);
    enableElement('btnDeleteSelectedVerseFromVerseOrder',
      ses.pageName);
  }    
}

function onSelectedVerseToEditChanged(event=null, ses) {
  if (!ses) {
    ses = getSongEditState();
  }
  ge('txtNewVerseName').value = '';
  if (ses.songData) {
    renderSelectControl(
      'selSongVerseOrder', 
      ses.songData.aPageOrder, 
      ses.songData.aPageOrder.length 
      ? 
        ses.selectedOrderVerseIdx ?
          ses.selectedOrderVerseIdx :
          0
      : 
        '', 
      Object.keys(ses.songData.aPageOrder)
      );
    ge('chkIsTagVerse').checked = ses.fIsTagVerse ? 'checked' : '';
  }
  setSongVerseError('');
  renderOverallOrderText();
  enableSongEditVerseButtons(ses);
}

function renderOverallOrderText() {
  const ses = getSongEditState();
  const html = getOverallOrderTextHTML(ses.songData, '&#8594;');
  ge('tdOverallVerseOrder').innerHTML = html;
}

function getOverallOrderTextHTML(sd, separator) {
  const aPageNamesUnwound = getUnwoundPages(sd);
  cPagesPerLine = sd.aPageOrder.length;
  let html = '';
  for(let iVerse = 0; iVerse < aPageNamesUnwound.length; iVerse++) {
    const fFirstPage = (iVerse == 0);
    const fAfterLastPage = (iVerse == aPageNamesUnwound.length);
    const fStartOfRepeat = ((iVerse % cPagesPerLine) == 0);
    // console.log(`iVerse:${iVerse} FirstPg:${fFirstPage} LastPg:${fAfterLastPage} Repeat:${fStartOfRepeat} Verse Name:${aPageNamesUnwound[iVerse]}`);
    if (!(fFirstPage || fAfterLastPage || fStartOfRepeat)) {
      html += separator;
    }
    if (!fStartOfRepeat || fFirstPage) {
      html += aPageNamesUnwound[iVerse];
    } else {
      html += `<br>${aPageNamesUnwound[iVerse]}`;
    }
  }

  return html;
}

function onVerseLinesChanged(event) {
  const ses = getSongEditState();
  ses.songData.oPages[ses.pageName] =
    ge('txtaVerseLines').value.split('\n');
  show('spnVerseUpdatedNotice');
  setTimeout(() => {
    hide('spnVerseUpdatedNotice');
  }, 3000);
}

function onNewVerseNameChanged (event) {
  enableSongEditVerseButtons();
}
 
function onIsTagVerseChanged(event) {
  const es = getSongEditState();
  es.songData.TagPage = es.fIsTagVerse ? es.pageName : '';
  renderOverallOrderText();
}

function onVerseOrderChanged(event) {
  enableSongEditButtons();
  renderOverallOrderText();
}

function addANewVerse(event) {
  const ses = getSongEditState();
  if (!ses.newVerseName) {
    ge('divVerseNameEditError').innerText = 
      'You must first enter a verse name to add one.';
    return;
  }
  if (ses.aPageNames.includes(ses.newVerseName)) {
    ge('divVerseNameEditError').innerText = 
      `There already is a verse named "${ses.newVerseName}".`;
    return;    
  }

  // clear the text for the new verse
  ses.songData.oPages[ses.newVerseName] = '';
  
  // BUG: Not sure why but sometimes we have an extra null verse
  delete ses.songData.oPages[''];
  
  fillSongToEdit();
  ge('selSongVersesToEdit').value = ses.newVerseName;
  onSelectedVerseToEditChanged(null, ses);
  enableSongEditVerseButtons();
  ge('txtaVerseLines').value = '';
  ge('txtaVerseLines').focus();
}

async function renameSelectedVerse(event) {
  const ses = getSongEditState();
  console.assert(ses.pageName, 'UI should prevent this.');  
  if (!ses.newVerseName) {
    setSongVerseError('You must set a verse name to rename this verse to.');
    return;
  }
  ses.songData.oPages[ses.newVerseName] = 
    ses.songData.oPages[ses.pageName];
  delete ses.songData.oPages[ses.pageName];
  if (ses.songData.TagPage == ses.pageName) {
    ses.songData.TagPage = ses.newVerseName;
  }
  let idx = -1;
  while ((idx = ses.songData.aPageOrder.indexOf(ses.pageName)) != -1) {
    ses.songData.aPageOrder[idx] = ses.newVerseName;
  }  
  fillSongToEdit();
  ge('selSongVersesToEdit').value = ses.newVerseName;
  onSelectedVerseToEditChanged();
}

async function deleteSelectedVerse(event) {
  const ses = getSongEditState();
  console.assert(ses.pageName, 'UI should prevent this.');
  while (ses.songData.aPageOrder.includes(ses.pageName)) {
    ses.songData.aPageOrder.
      splice(ses.songData.aPageOrder.indexOf(ses.pageName), 1);
  }
  if (ses.songData.TagPage == ses.pageName) {
    ses.songData.TagPage = '';
  }
  delete ses.songData.oPages[ses.pageName];
  fillSongToEdit();
}

function previewVerse(event) {
  showFieldset('imgNavSection');
  window.scrollTo(0, 
    ge('fsNav').getBoundingClientRect().y - 
    ge('body').getBoundingClientRect().y);
  ge('selNavSongs').value = ge('selAllSongsToEdit').value;
  ge('chkNavSongMode').checked = 'checked';
  onModeChanged();
  g.nav.iSongInSet = 0;
  g.nav.iPageInSong = ge('selSongVerseOrder').value;
  g.nav.fBlankScreen = false;
  renderNavSection();
}

function moveSelectedVerseUpInOrder(event) {
  const ses = getSongEditState();
  console.assert(ses.selectedOrderVerseIdx > 0);
  const T = ses.songData.aPageOrder[ses.selectedOrderVerseIdx];
  ses.songData.aPageOrder[ses.selectedOrderVerseIdx] =
    ses.songData.aPageOrder[ses.selectedOrderVerseIdx - 1];
  ses.songData.aPageOrder[ses.selectedOrderVerseIdx - 1] = T;
  ge('selSongVerseOrder').value = ses.selectedOrderVerseIdx - 1;
  fillSongToEdit();
}

function moveSelectedVerseDownInOrder(event) {
  const ses = getSongEditState();
  console.assert(ses.selectedOrderVerseIdx < ses.songData.aPageOrder.length - 1);
  const T = ses.songData.aPageOrder[ses.selectedOrderVerseIdx];
  ses.songData.aPageOrder[ses.selectedOrderVerseIdx] =
    ses.songData.aPageOrder[ses.selectedOrderVerseIdx + 1];
  ses.songData.aPageOrder[ses.selectedOrderVerseIdx + 1] = T;
  ge('selSongVerseOrder').value = ses.selectedOrderVerseIdx + 1;
  fillSongToEdit();
}

function addVerseToVerseOrder(event) {
  const ses = getSongEditState();
  if (undefined == ses.selectedOrderVerseIdx) {
    ses.songData.aPageOrder.push(ses.pageName);
  } else {
    ses.songData.aPageOrder.splice(ses.selectedOrderVerseIdx + 1, 0, ses.pageName);
  }
  fillSongToEdit();  
  ge('selSongVerseOrder').value = ses.selectedOrderVerseIdx + 1;
}

function deleteVerseOrderVerse(event) {
  const ses = getSongEditState();
  ses.songData.aPageOrder.splice(ses.selectedOrderVerseIdx, 1);
  fillSongToEdit();    
}

// data search

function onSearchAll(event) {
  ge('chkSearchInSongSetNames').checked = 'checked';
  ge('chkSearchInSongSetSongNames').checked = 'checked';
  ge('chkSearchInSongNames').checked = 'checked';
  ge('chkSearchLyrics').checked = 'checked';
  ge('chkSearchNotes').checked = 'checked';
  ge('chkSearchTitleNotes').checked = 'checked';
  ge('chkSearchAuthor').checked = 'checked';
  ge('chkSearchPublisher').checked = 'checked';
  ge('chkSearchLicense').checked = 'checked';
  onSearchInChanged();
}

function onSearchNone(event) {
  ge('chkSearchInSongSetNames').checked = '';
  ge('chkSearchInSongSetSongNames').checked = '';
  ge('chkSearchInSongNames').checked = '';
  ge('chkSearchLyrics').checked = '';
  ge('chkSearchNotes').checked = '';
  ge('chkSearchTitleNotes').checked = '';
  ge('chkSearchAuthor').checked = '';
  ge('chkSearchPublisher').checked = '';
  ge('chkSearchLicense').checked = '';
  onSearchInChanged();
}

function onSearchInChanged(event) {
  const searchTerms = 
    ge('txtSearchFor').value.trim().toLocaleLowerCase();
  const fShowEditLinks = ge('chkShowSearchEditLinks').checked ? 1 : 0;
  const fShowVerseFlow = ge('chkShowSongVerseFlow').checked ? 1 : 0;
  let results = '';

  if (searchTerms.length == 0) {
    // don't respond to empty or tiny search terms cuz almost
    // everything will hit.
    results = "You must enter a search filter string or a '*' to find all items."
  } else {
    const aSearchTokens = searchTerms.split(/\s+/);
    let resultPart = '';
    if (ge('chkSearchInSongSetNames').checked) {
      resultPart = 'In Song Set Names:<div class="indent">';
      fResultFound = false;
      getAllSongSetNames().forEach(
        function(songSetName) {
          if (areAllTokensInText(aSearchTokens, songSetName)) {
            resultPart += `${getSongSetEditImage(songSetName, fShowEditLinks)}${songSetName}<br>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart + '</div>';
      }
    }

    if (ge('chkSearchInSongSetSongNames').checked) {
      resultPart = `In Song Set Song Names for:<div class="indent">`;
      fResultFound = false;
      getAllSongSetNames().forEach(
        function(songSetName) {
          let thisResultPart = '<div class="indent">';
          songLibrary.oSongSets[songSetName].forEach(
            function(songName) {
              if (areAllTokensInText(aSearchTokens, songName)) {
                thisResultPart += `${getSongEditImage(songName, fShowEditLinks)}${songName}<br>`;
                if (fShowVerseFlow) {
                  thisResultPart += `<div class="indent smaller">${getOverallOrderTextHTML(songLibrary.oSongs[songName], '&#8594;', '<br>')}</div>`;
                }
                fResultFound = true;
              }
            }
          );
          resultPart += '</div>';
          if (fResultFound) {
            resultPart += `${getSongSetEditImage(songSetName, fShowEditLinks)}${songSetName}:` + thisResultPart;
          }
        }
      );
      if (fResultFound) {
        results += resultPart + '</div>';
      } 
    }

    if (ge('chkSearchInSongNames').checked) {
      resultPart = 'In Song Names:<div class="indent">';
      fResultFound = false;
      getAllSongNames().forEach(
        function(songName) {
          if (areAllTokensInText(aSearchTokens, songName)) {
            resultPart += `${getSongEditImage(songName, fShowEditLinks)}${songName}`;
            if (fShowVerseFlow) {
              resultPart += `<div class="indent smaller">${getOverallOrderTextHTML(songLibrary.oSongs[songName], '&#8594;', '<br>')}</div>`;
            } else {
              resultPart += '<br>'
            }
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart + '</div>';
      }
    }

    if (ge('chkSearchLyrics').checked) {
      resultPart = 'In Song Lyrics:<div class="indent">';
      fResultFound = false;
      let prevSongName = '';
      getAllSongEntries().forEach(
        function(oSongKV) {
          Object.entries(oSongKV[1].oPages).sort().forEach(
            function(aPageKV) {
              let fLineFits = false;
              aPageKV[1].forEach(
                function(lyricLine) {
                  if (areAllTokensInText(aSearchTokens, lyricLine)) {
                    fLineFits = true;
                  }
                }
              );              
              if (fLineFits) {
                resultPart += '<div class="indent">';
                if (prevSongName != oSongKV[0]) {
                  prevSongName = oSongKV[0];
                  resultPart += `Song:${getSongEditVerseImage(oSongKV[0], oSongKV[1], fShowEditLinks)} "${oSongKV[0]}"<br>`;
                }
                resultPart += `Verse:${getSongEditVerseImage(oSongKV[0], aPageKV[0], fShowEditLinks)} "${aPageKV[0]}"<br>`;
                aPageKV[1].forEach(
                  function(lyricLine) {
                    if (areAllTokensInText(aSearchTokens, lyricLine)) {
                      resultPart += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${lyricLine}<br>`;
                      fResultFound = true;
                    }
                  }
                );
                resultPart += '</div>';
              }
            }
          );
        }
      )
      if (fResultFound) {
        results += resultPart + '</div>';
      }
    }

    if (ge('chkSearchNotes').checked) {
      resultPart = 'In Song Notes:<div class="indent">';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].Notes)) {
            resultPart += `Song: ${getSongEditImage(oSongKV[0], fShowEditLinks)}"${oSongKV[0]}"
            <div class="indent">${
              oSongKV[1].Notes
            }</div>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart + '</div>';
      }
    }


    if (ge('chkSearchTitleNotes').checked) {
      resultPart = 'In Song Title Page Notes:<div class="indent">';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].TitleNote)) {
            resultPart += `Song: ${getSongEditImage(oSongKV[0], fShowEditLinks)}"${oSongKV[0]}"
            <div class="indent">${
              oSongKV[1].TitleNote
            }</div>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart + '</div>';
      }
    }    

    if (ge('chkSearchAuthor').checked) {
      resultPart = 'In Song Authors:<div class="indent">';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].Author)) {
            resultPart += `Song: ${
              getSongEditImage(oSongKV[0], fShowEditLinks)
            }"${
              oSongKV[0]
            }"<div class="indent">${
              oSongKV[1].Author
            }</div>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart + '</div>';
      }  
    }

    if (ge('chkSearchPublisher').checked) {
      resultPart = 'In Song Publshers:<div class="indent">';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].Publisher)) {
            resultPart += `Song: ${
              getSongEditImage(oSongKV[0], fShowEditLinks)
            }"${
              oSongKV[0]
            }"<div class="indent">${
              oSongKV[1].Publisher
            }</div>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart + '</div>';
      }   
    }

    if (ge('chkSearchLicense').checked) {
      resultPart = 'In Song Licenses:<div class="indent">';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].License)) {
            resultPart += `Song: ${
              getSongEditImage(oSongKV[0], fShowEditLinks)
            }"${
              oSongKV[0]
            }"<div class="indent">${
              oSongKV[1].License
            }</div>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart + '</div>';
      }   
    }
  }

  if (results) {
    results = `Results of searching for "${searchTerms}":<div class="indent">${results}</div>`;
  }
  ge('divSearchResults').innerHTML = results;
}

function getSongSetEditImage(songSetName, fShowEditLinks) {
  html = '';
  if (fShowEditLinks) {
    html = `<a onclick="editSongSet('${
      songSetName
    }');"><img src="img/edit.jpg" 
    class="editBtn CreateOrEditSongSetBG" 
    title="Edit this Song Set">
    </a>&nbsp;`;
  }

  return html;  
}

function editSelectedNavSongSet(event) {
  const songSetName = ge('selNavSongSets').value;
  if (songSetName) {
    editSongSet(songSetName);
  }
}

function editSongSet(songSetName) {
  showFieldset('imgCreateOrEditSongSet');
  window.scrollTo(0, 
    ge('fsCreateOrEditSongSet').getBoundingClientRect().y - 
    ge('body').getBoundingClientRect().y);
  ge('selAllSongSetsToEdit').value = songSetName;
  editSelectedSongSet();
}

function getSongEditImage(songName, fShowEditLinks) {
  html = '';
  if (fShowEditLinks) {
    html = `<a onclick="editSong('${
      songName
      }');"><img src="img/edit.jpg" 
      class="editBtn CreateOrEditSongBG" 
      title="Edit this Song"/>
      </a>&nbsp;`;
  }
  return html;
}

function getSongEditVerseImage(songName, verseName, fShowEditLink) {  
  let html = '';

  if (fShowEditLink) {
    html = `<a onclick="editSong('${
      songName
    }', '${
      verseName
    }');"><img src="img/edit.jpg" 
    class="editBtn CreateOrEditSongBG" 
    title="Edit this Song and Verse"/>
    </a>&nbsp;`;
  }
  
  return html;
}

function editSelectedNavSong(event) {
  const songName = ge('selNavSongs').value;
  if (songName) {
    editSong(songName);
  }
}

function editSelectedNavSongVerse(event) {
  const nav = getNavState();
  if (nav.songName) {
    editSong(nav.songName,  nav.pageName);
  }  
}

function editSong(songName, verseName='') {
  showFieldset('imgCreateOrEditSong');
  window.scrollTo(0, 
    ge('fsCreateOrEditSong').getBoundingClientRect().y - 
    ge('body').getBoundingClientRect().y);
  ge('selAllSongsToEdit').value = songName;
  fillSongToEdit();
  if (verseName) {
    ge('selSongVersesToEdit').value = verseName;
    onSelectedVerseToEditChanged();
    ge('txtaVerseLines').focus();
  }

}

function getSongVerseEditImage(songName, verseName) {
  return `<a onclick="editSong('${
      songName
    }', '${
      verseName
    }');"><img src="img/edit.jpg" 
    class="editBtn CreateOrEditSongBG" 
    title="Edit this Song"/>
    </a>&nbsp;`;
}

function areAllTokensInText(aLCTokens, text) {
  if (!text) {
    return false;
  }
  text = text.toString();
  if (!aLCTokens || aLCTokens.length == 0) {
    return false;
  }
  if (aLCTokens[0] == '*') {
    return true;  // * = return all
  }
  text = text.toLocaleLowerCase();
  let fTokenNotFound = false;
  // aTokens[] is assumed to already assumed to be lower case
  aLCTokens.forEach(
    function(sLCToken) {
      if (text.indexOf(sLCToken) == -1) {
        fTokenNotFound = true;
      }
    }
  )

  return !fTokenNotFound;
}

// import export

const fileIOOptions =  {
  suggestedName: 'Test.txt',
  types: [
    {
      description: 'JSON Files',
      accept: { 'text/javascript': [ '.json' ] }       
    },
  ]
};

function clearExImNoticesAndErrors() {
  ge('divImportExportError').innerText = '';  
}

function setExImError(sErr) {
  const el = ge('divImportExportError');
  el.classList.remove('greenText');
  el.classList.add('redText');
  el.innerText = sErr;
}

function setExImNotice(sNotice) {
  const el = ge('divImportExportError');
  el.classList.remove('redText');
  el.classList.add('greenText');
  el.innerText = sNotice;
}

function exportLibrary(event) {
  clearExImNoticesAndErrors();
  const sOut = JSON.stringify(songLibrary, null, 2);
  ge('txtaImportExport').value = sOut;
  setExImNotice('Successfullly exported the current song library to the text area.');
}

function importLibrary(event) {
  let sIn = ge('txtaImportExport').value;
  importLibraryFromText(sIn);
}

function importLibraryFromText(text) {
  clearExImNoticesAndErrors();
  let o = {};
  try {
    o = JSON.parse(text);
  } catch(error) {
    setExImError(`Failed to import song library text: ${error.message}`);
    return;
  }
  if (!o.oSongs || !o.oSongSets || !o.defaults) {
    setExImError(`The imported data does not appear to be a proper song library.`);
    return;
  }
  songLibrary = o;
  initSiteUI();
  setExImNotice('Successfully imported song library data.');
}

function importToUI(fileName, sData) {
  if (fileName) {
    // Success
    ge('txtaImportExport').value = sData;
    importLibraryFromText(sData);
    setExImNotice(`Successfully imported the Song Library from the file "${fileName}"`);
  } else {
    // failure
    setExImError(sData);
  }
}

function importDrop(event) {
  event.preventDefault();
  fio.onDropFile(event, importToUI);
}

async function importFromFile() {
  var fileHandle;
  try {
    fileHandle = await window.showOpenFilePicker(fileIOOptions);
    fio.importFromFileOpenPicker(fileHandle, importToUI);
  } catch(e) {
    importToUI('', 'Error: ' + e.message);
  }
}

function importFromLS() {
  const sData = localStorage.getItem('savedSongLibrary');
  if (sData) {
    ge('txtaImportExport').value = sData;
    importLibrary();
    setExImNotice('Successfully imported song library from local storage.')
  } else {
    setExImError('No data was found in local storage to import.')
  }
}

function exportToUI(fileName, sError_or_sData) {
  if (fileName) {
    // Success
    ge('txtaImportExport').value = sError_or_sData;
    setExImNotice(`Successfully exported song library data to the file "${fileName}".`);
  } else {
    // failure
    setExImError('Error: ' + sError_or_sData);
  }
}

async function exportToFile(event) {
  try {
    const fileHandle = await window.showSaveFilePicker(fileIOOptions);
    clearExImNoticesAndErrors();
    const sData = ge('txtaImportExport').value = JSON.stringify(songLibrary, null, 2)
    fio.exportToFile(fileHandle, sData, exportToUI);
  } catch(e) {
    exportToUI('', e.message);
  }
}

function exportToLS() {
  const sData = JSON.stringify(songLibrary, null, 2);
  ge('txtaImportExport').value = sData;
  localStorage.setItem('savedSongLibrary', sData);
  setExImNotice('Successfully exported song library to local storage.');
}

// printing

function printNavModeData(style) {
  const nav = getNavState();

  setSongSetError('');
  ge('divPrintSongError').innerText = '';

  const oPrintState = {
    nPrintPageNumber: 0,
    htmlPrintSoFar: '',
    nSongOfSongSet: 0,
    style: style
  }
  
  if (nav.mode == 'songSet') {
    oPrintState.cSongsInSet = nav.aSongsInSet.length;
    nav.aSongsInSet.forEach(
      function(songName, idx) {
        if (idx > 0 || songName.toLowerCase() != 'welcome') {
          // don't print the welcome song if it is first
          getPrintHTMLForASong(oPrintState, songName, nav.songSetName);
        } else {
          oPrintState.cSongsInSet--;
        }
      }
    );
  } else if (nav.mode == 'review') {
    oPrintState.htmlPrintSoFar = getPrintReviewHTML();
  } else { // song mode
    getPrintHTMLForASong(oPrintState, nav.songName, '');
  }

  oPrintState.htmlPrintSoFar = oPrintState.htmlPrintSoFar
    .replace(/%totalPrintPages%/g, oPrintState.nPrintPageNumber);

  printHTML(oPrintState.htmlPrintSoFar, nav);
}

function printHTML(html, nav) {
  const savedSongNameBeingEdited = ge('selAllSongsToEdit').value
  const htmlBodySaved = document.body.innerHTML;
  document.body.innerHTML = html;
  window.print();
  document.body.innerHTML = htmlBodySaved;

  // reset the nav select controls wrt what they were before printing.
  if (nav.mode == 'songSet') {
    renderSongSetDropdown(
      'selNavSongSets', 
      'txtNavSongSetFilter', 
      nav.songSetName,
      'spnNoSongSets');
    ge('chkNavSongSetMode').checked = 'checked';
  } else if (nav.mode == 'song') {
    renderSongDropDown(
      'selNavSongs', 
      'txtNavSongFilter', 
      nav.songName, 
      'spnNoSongsDefined');
    ge('chkNavSongMode').checked = 'checked';
  } else {
    // review mode
    ge('rdoReviewMode').checked = 'checked';
  }

  ge('selAllSongsToEdit').value = savedSongNameBeingEdited;
  fillSongToEdit();
}

/**
 * This function is meant to be called successively for each
 * song to print.
 * Each call to this function adds to oPrintState.htmlPrintSoFar
 * and increments the nSongOfSongSet and nPrintPageNumber appropriately.
 * When all calls to this function are done, the caller needs to 
 * replace %totalPrintPages% in the .htmlPrintSoFar string with the 
 * final value of oPrintState.nPrintPageNumber.
 * 
 * @param {object} oPrintState // tracks page numbers, options, etc.
 *  .nPrintPageNumber - next page to output - starts at 0
 *  .htmlPrintSoFar - generated print html 
 *  .nSongOfSongSet - current song output count - starts at 0
 *  .style - 'songBook' | 'songs' | 'review'
 *  .songSetName - should be set if we are printing pages of a songSet
 * @param {string} songName // songLibrary song name
 * @param {string} songSetName // songLibrary songSet name or '' if not in a songset
 */
function getPrintHTMLForASong(
  oPrintState, 
  songName, 
  songSetName = '') 
{
  console.assert(oPrintState);
  console.assert(typeof(oPrintState.htmlPrintSoFar) == 'string');
  console.assert(
    oPrintState.style == 'songs' ||
    oPrintState.style == 'songBook' ||
    oPrintState.style == 'review');
  console.assert(songName);

  const cRows = 5; // row height css classes need to adjust to this number
  const cCols = 2;
  const cVersesPerPage = cRows * cCols;

// cCols cells per Verse Row
  const htmlVerseCellTemplate = 
`<td class="tdPrintVerseCell">
  <h6 class="al">%pageName%</h6>
  <div class="divIndent">%pageLines%</div>
</td>
`;

  // we print the verses in cCols columns of cRows rows each
  const htmlVerseRowTemplate = 
`<tr class="trPrintVerseRow">
  %printVerseCells%
</tr>
`;

// overall template with %placeholders% for parts
  const htmlPageTemplateBase = 
`<div id="divPrintPage showPrintOnly" class="pgNoBrkInside">
  <table id="tblPrint" 
    class="_tblDebugBorder"
    >
    <tr class="trPrintTopRow">
      <td colspan="100%" class="ac">
        <h4 class="m0">%songName%%songSetName%%pagesInSong%</h4>
      </td>
    </tr>
    %cellRows%
    <tr class="trPrintBottomRow">
      <td colspan="2" width="100%" class="vab">
        <table width="100%">
          <tr class="trPrintBottomInfoRow">
            <td class="al" width="25%">%Author%<br>%Publisher%</td>
            <td class="ac" width="50%">%Notes%</td>
            <td class="ar" width="25%">%License%<br>Page %pageNumber% of %totalPrintPages%</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>  
</div>
`;

  // reference songData for this song with a nice short name
  const sd = songLibrary.oSongs[songName];
  console.assert(sd);
    
  // fill in all the values that are constant for this song.
  let htmlPageTemplate = htmlPageTemplateBase
    .replace(/%Publisher%/, sd.Publisher)
    .replace(/%Author%/, sd.Author)
    .replace(/%Notes%/, sd.Notes)
    .replace(/%License%/, sd.License ? sd.License : songLibrary.defaults.License)
    .replace(/%songName%/, songName);

  if (songSetName) {
    oPrintState.nSongOfSongSet++;
    htmlPageTemplate = htmlPageTemplate
      .replace(/%songSetName%/, ` (Song ${oPrintState.nSongOfSongSet} of ${oPrintState.cSongsInSet} in "${songSetName}")`);
  } else {
    htmlPageTemplate = htmlPageTemplate
      .replace(/%songSetName%/, '');
  }    

  oPrintState.cPrintPagesForSong = 0;
  const aUnwoundVerses = getUnwoundPages(sd);
  const cVersesPerRepeat = sd.aPageOrder.length;
  const cVersesInSong = aUnwoundVerses.length;
  let iVerseInSong = 0;

  let htmlSong = '';
  let cPagesForThisSong = Math.ceil(cVersesInSong / cVersesPerPage);
  if (!cVersesInSong) {
    cPagesForThisSong = 1; // no verses case
  }
  while (cPagesForThisSong--) { // for each print page in this song...
    let htmlRows = '';
    for (let iRow = 0; iRow < cRows; iRow++) { // for each row on this page...
      let htmlCells = '';
      for (let iCol = 0; iCol < cCols; iCol++) { // for each column in this row...
        const iVerseInCol = iVerseInSong + iCol * cRows;
        if (iVerseInCol >= cVersesInSong) { // blank verse to finish page
          if (!cVersesInSong && iVerseInCol == 0) {  // no verses case
            htmlCells += htmlVerseCellTemplate
              .replace(/%pageName%/, ``)
              .replace(/%pageLines%/, `There are no verses in this song.`);            
          } else { // empty verse cell      
            htmlCells += htmlVerseCellTemplate
              .replace(/%pageName%/, '&nbsp;')
              .replace(/%pageLines%/, '&nbsp;');
          }
        } else { // fill in proper verse for this row/col.
          const verseName = aUnwoundVerses[iVerseInCol];
          const lines = sd.oPages[verseName].length ? 
            sd.oPages[verseName].join(`<br>`) : 
            sd.oPages[verseName];
          const aCountExt = [ 'st', 'nd', 'rd', 'th', 'th' ];
          // iPageRepeat should be 0 for the first repeat and increment
          // for each repeat of the cVersesPerRepeat pages.
          let iPageRepeat = Math.floor(iVerseInCol / cVersesPerRepeat);
          console.assert(iPageRepeat < aCountExt.length);
          // console.log(`iVerseInCol:${iVerseInCol}, iPageRepeat:${iPageRepeat}`);
          let sRepeatText = ' ' + (iPageRepeat + 1) + aCountExt[iPageRepeat] + ' time';
          if (iPageRepeat == 0) {
            sRepeatText = '';
          }
          htmlCells += htmlVerseCellTemplate
            .replace(/%pageName%/, `${iVerseInCol + 1}) ${verseName}${sRepeatText}:`)
            .replace(/%pageLines%/, lines);
        }
      } // end col
      iVerseInSong++; // next row base verse
      htmlRows += htmlVerseRowTemplate
        .replace(/%printVerseCells%/, htmlCells); // add row
    } // end row
      
    // substitute parts for this page
    oPrintState.cPrintPagesForSong++;
    oPrintState.nPrintPageNumber++;
    iVerseInSong += cRows;
    htmlSong += htmlPageTemplate 
      .replace(/%cellRows%/, htmlRows)
      .replace(/%pageNumber%/, oPrintState.nPrintPageNumber);
  } // end page

  // substitue parts for this song we don't know till now
  if (oPrintState.cPrintPagesForSong > 1) {
    htmlSong = htmlSong
      .replace(/%pagesInSong%/g, ` [${oPrintState.cPrintPagesForSong} pages]`);
  } else {
    htmlSong = htmlSong
      .replace(/%pagesInSong%/g, ``);
  }

  oPrintState.htmlPrintSoFar += htmlSong; 

  if (!oPrintState.aTOCInfo) {
    oPrintState.aTOCInfo = [];
  }
  oPrintState.aTOCInfo.push([songName, oPrintState.nPrintPageNumber]);
} // getPrintHTMLForASong

function getPrintReviewHTML() {
  let html = '';

  html += '<div class="smaller">';

  // songSets

  html += '<div class="flexContainer m2em">';

  // all printing is a series of divs which 
  // are laid out via flex for each song, or songSet 
  Object.keys(songLibrary.oSongSets).sort().forEach(
    (songSetName) => {
      html += '<div class="flexItem p1em pgBrkFlex">';
      html += `SongSet: <b>${songSetName}</b>`;
      html += '<ol>';
      songLibrary.oSongSets[songSetName].forEach(
        function(songName) {
          html += `<li>${songName}</li>`;
        }
      );
      html += '</ol>';
      html += '</div>'; // flexItem
    }
  );

  html += '</div>'; // flexContainer

  // Songs

  html += '<br>';
  html += '<div class="flexContainer m2em">';

  Object.keys(songLibrary.oSongs).sort().forEach(
    (songName) => {
      html += '<div class="flexItem p1em pgBrkFlex">';
        html += `Song: <b>${songName}</b><br>`;
        html += 'Unique Pages:';
        html += '<ul>'
      let sd = songLibrary.oSongs[songName];
      Object.keys(sd.oPages).sort().forEach(
        function(pageName) {
          const fTag = sd.TagPage == pageName;
          let sTag = ' ';
          if (fTag) {
            sTag = ' (Tag) ';
          }
          html += `<li>"${pageName}"${sTag}Lyrics:<br><ol>`;
          sd.oPages[pageName].forEach(
            function(lyricLine) {
              html += `<li>${lyricLine}</li>`;
            }
          );
          html += '</ol>';
        }
      );
      html += '</ul>';

      html += 'Verse Order:<br>&nbsp;&nbsp;';
      html += getOverallOrderTextHTML(sd, '&#8594;');

      html += '<br><br>Other Values:<ul>';
      html += `<li>Title Note: [${sd.TitleNote}]</li>`;
      html += `<li>Notes: [${sd.Notes}]</li>`;
      html += `<li>Author: [${sd.Author}]</li>`;
      html += `<li>Publisher: [${sd.Publisher}]</li>`;
      html += `<li>Repeat Count: [${sd.RepeatCount}]</li>`;
      html += `<li>License: [${sd.License ? sd.License : songLibrary.defaults.License}]</li>`;
      html += `<li>Song Book Title: [${songLibrary.defaults.songBookTitle}]</li>`;
      html += '</ul>';

      html += '</div>'; // flexItem
    }
  );

  html += '</div>'; // flexContainer

  return html;
}

function printSongBook() {
  const oPrintState = {
    nPrintPageNumber: 0,
    htmlPrintSoFar: '',
    nSongOfSongSet: 0,
    style: 'songBook'
  }
  Object.keys(songLibrary.oSongs).sort().forEach(
    function (songName) {
      getPrintHTMLForASong(oPrintState, songName);
    }
  );
  oPrintState.htmlPrintSoFar = oPrintState.htmlPrintSoFar
    .replace(/%totalPrintPages%/g, oPrintState.nPrintPageNumber );
  printHTML(getTOCHtml(oPrintState) + oPrintState.htmlPrintSoFar, getNavState());
}

function printSongSetList() {
  const tmpl = 
  `<div id="divPrintPage showPrintOnly">
    <table id="tblPrint _tblDebugBorder" class="pgBrkAuto">
      <tr class="trPrintTopRow">
        <td colspan="100%" class="ac">
          <h4 class="m0">Song list for set "%songSetName%"</h4>
        </td>
      </tr>
      %cellRows%
    </table>  
  </div>
  `;

  ge('chkNavSongSetMode').checked = 'checked';
  onModeChanged();
  const nav = getNavState();
  let htmlList = '';
  if (nav.aSongsInSet && nav.aSongsInSet.length) {
    htmlList += '<tr><td class="al"><ol class="songSetList">';
    nav.aSongsInSet.forEach(
      function(songName) {
        htmlList += `
<li>
  <b>${songName}</b>
  <br>
  ${getOverallOrderTextHTML(songLibrary.oSongs[songName], '&#8594;', '<br>')}
  <br>
  <br>
</li>
`;
      }
    );
    htmlList += '</ol></td></tr>';
  } else {
    htmlList = '<tr><td class="ac">There are no songs in this Song Set.</td></tr>';
  }
  const htmlPrint = tmpl
    .replace(/%cellRows%/, htmlList)
    .replace(/%songSetName%/, ' ' + nav.songSetName);
  printHTML(htmlPrint, nav);
}

function getTOCHtml(oPrintState) {
  const songBookTitle = songLibrary.defaults.songBookTitle;
  const maxLinesPerPage = 44;
  const maxLinesPerFirstPage = songBookTitle ? 39 : maxLinesPerPage;
  const aTOCPageNumbers = [ 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii' ];
  let iTOCPage = 0;

  let htmlTOC = `
<div class="pgBrkAfter">
%songBookTitle%
<h2>
  Table of Contents
</h2>
<div class="al indent">`;

  let iLine = 0;
  for (; iLine < oPrintState.aTOCInfo.length; iLine++) {
    htmlTOC += `
Page ${
      oPrintState.aTOCInfo[iLine][1]
}
  <span class="ar">${
      oPrintState.aTOCInfo[iLine][0]
}
  </span><br>`;

    if (iLine == maxLinesPerFirstPage || 
       (iLine > maxLinesPerFirstPage && 
         ((iLine - maxLinesPerFirstPage) % maxLinesPerPage) == 0)) {
      htmlTOC += `<br><div class="ar fw">Page ${aTOCPageNumbers[iTOCPage]}</div>
</div><div class="pgBrkAfter al indent">`;
      iTOCPage++;
    }
  } // for each toc line

  // add the last page of the TOC page number
  htmlTOC += `<div class="ar fw">Page ${aTOCPageNumbers[iTOCPage]}</div>`;

  htmlTOC += '</div>'; // close page break div

  // replace songBookTitle
  if (songBookTitle) {
    htmlTOC = htmlTOC
      .replace(/%songBookTitle%/, 
        `<h1>${songLibrary.defaults.songBookTitle}</h1>`);
  } else {
    htmlTOC = htmlTOC
      .replace(/%songBookTitle%/, '');
  }

  return htmlTOC;
}

// UI utilities

g.visibility = {};
function toggleFieldsetVisibility(event) {
  const feildsetId = event.target.parentElement.parentElement.id
  if (!g.visibility[feildsetId]) {
    g.visibility[feildsetId] = {};
  }
  const fShow = event.target.src.indexOf('show.png') != -1;

  show(ge(feildsetId).childNodes[1].nextElementSibling, fShow);
  event.target.src = `img/${fShow ? 'hide' : 'show'}.png`;
  g.visibility[feildsetId].fShown = fShow;
}

function showHelp(helpFileName) {
  hideHelp(); 
  hide('divRootForm');
  show('divHelp');
  elDiv = ge('divHelp');
  elDiv.innerHTML = `
<button onclick="hideHelp();">
  Hide Help
</button>
<br>
<video  id="helpVideo" controls autoplay class="vidBdr">
  <source src="help/${helpFileName}.mp4" type="video/mp4">
</video>
  `;
}

function hideHelp(event) {
  const vid = document.getElementById('helpVideo');
  if (vid) {
    // stop any previously runing video
    vid.pause(0);
    vid.setAttribute('src', '');
  }
  hide('divHelp');
  show('divRootForm');
}

function showFieldset(idImg) {
  const el = ge(idImg);
  if (!g.visibility[el.parentElement.parentElement.id].fShown) {
    toggleFieldsetVisibility({ target: el });
  }
}

function enableElement(id, fEnable=true) {
  const el = ge(id);
  if (fEnable) {
    el.removeAttribute('disabled');
  } else {
    el.setAttribute('disabled', '');
  }  
}

function renderSongSetDropdown(
  idSel, 
  filterId='', 
  selectedSongSetName='',
  noSongsId) 
{
  const elSel = ge(idSel);
  let aSongSetNames = getAllSongSetNames();
  const cUnfilteredSongNames = aSongSetNames.length;
  if (filterId) {
    aSongSetNames = 
      applyFilterToTextArray(ge(filterId).value, aSongSetNames);
  }
  if (!selectedSongSetName && aSongSetNames.length) {
    selectedSongSetName = aSongSetNames.at(-1);
  }
  renderSelectControl(idSel, aSongSetNames, selectedSongSetName);
  if (noSongsId) {
    show(idSel, elSel.value);
    show(noSongsId, !elSel.value);
    if (!elSel.value) {
      if (cUnfilteredSongNames && filterId) {
        ge(noSongsId).innerText = 'No song sets fit the filter.';
      } else {
        ge(noSongsId).innerText = 'No song sets are defined.';
      }
    }
  }
}

function renderSongDropDown(
    idSel, 
    filterId, 
    selectedSongName='',
    noSongsId='') 
{
  elSel = ge(idSel);
  let aSongNames = getAllSongNames();
  const cUnfilteredSongNames = aSongNames.length;
  if (filterId) {
    aSongNames = applyFilterToTextArray(
      ge(filterId).value,
      aSongNames);
  }
  if (!selectedSongName && aSongNames.length) {
    selectedSongName = aSongNames[0];
  } else {
    selectedSongName = '';
  }
  renderSelectControl(idSel, aSongNames, selectedSongName);
  if (noSongsId) {
    show(idSel, elSel.value);
    show(noSongsId, !elSel.value);
    if (!elSel.value) {
      if (cUnfilteredSongNames && filterId) {
        ge(noSongsId).innerText = 'No songs fit the filter.';
      } else {
        ge(noSongsId).innerText = 'No songs are defined.';
      }
    }
  }
  // returns length of filtered songs
  return Array.from(ge(idSel).options)  .length;
}

// general utilities

function lcSort(a, b) {
  a = a.toLocaleLowerCase();
  b = b.toLocaleLowerCase();
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

function getAllSongSetNames() {
  return Object.keys(songLibrary.oSongSets).sort(lcSort);
}

function getAllSongNames() {
  return Object.keys(songLibrary.oSongs).sort(lcSort);
}

function getAllSongEntries() {
  return Object.entries(songLibrary.oSongs).sort(
    (a, b) => {
      a = a[0];
      b = b[0];
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }
  )
}

function getCountOfSongsInSongSet(songSetName) {
  console.assert(Array.isArray(songLibrary.oSongSets[songSetName]));
  return songLibrary.oSongSets[songSetName].length;
}

function getIndexOfPageInCurrentSongInReview(songData, pageName) {
  let iPage = 0;
  const aPages = Object.keys(songData.oPages).sort();
  while (iPage < aPages.length && 
         aPages[iPage] != pageName) {
    iPage++;
  }
  return iPage;
}

function applyFilterToTextArray(filterText, aText) {
  filterText = filterText.toLocaleLowerCase().trim();
  if (!filterText) {
    return aText;
  }

  return aText.filter(
    function (text) {
      aTokens = text.toLocaleLowerCase().split(/\s+/);
      aFilterTokens = filterText.split(/\s+/);
      // applly an OR to any filter token that is contined 
      // within a text token
      let fMatched = false;
      for (sToken of aTokens) {
        for (sFilterToken of aFilterTokens) {
          if (sFilterToken && sToken &&
              sToken.indexOf(sFilterToken) != -1) {
            fMatched = true;
            break;
          }
        }
        if (fMatched) {
          break;
        }
      }
      return fMatched;
    } 
  );
}

function checkSongLibrary() {
  const aAllSongNames = Object.keys(songLibrary.oSongs);
  const aAllSongSetNames = Object.keys(songLibrary.oSongSets);
  aAllSongSetNames.forEach(
    function(songSetName) {
      songLibrary.oSongSets[songSetName].forEach(
        function (songSetSongName) {
          if (!aAllSongNames.includes(songSetSongName)) {
            console.error(`Song set "${songSetName}" references the song "${songSetSongName}" that doesn't exist.`)
          }
        }
      );
    }
  );
  aAllSongNames.forEach(
    function(songName) {
      const songData = songLibrary.oSongs[songName];
      const aPageNames = Object.keys(songData.oPages);
      const aPageOrderNames = songData.aPageOrder;
      aPageOrderNames.forEach(
        function(pageOrderPageName) {
          if (!aPageNames.includes(pageOrderPageName)) {
            console.error(`Song "${
              songName
            }" references a page name "${
              pageOrderPageName
            }" in its aPageOrder list that is not defined.`);
          }
        }
      )
    }
  );
}

function healSongLibrary() {
  let o = songLibrary;

  // fix up global default values
  if (!o.defaults.fontSize) o.defaults.fontSize = 0.076;
  o.defaults.fontSize = fixit(o.defaults.fontSize, 3);

  if (!o.defaults.fontBoldness) o.defaults.fontBoldness = 5;
  o.defaults.fontBoldness = Number(o.defaults.fontBoldness);

  if (!o.defaults.lineHeight) o.defaults.lineHeight = 0.13;
  o.defaults.lineHeight = fixit(o.defaults.lineHeight, 3);

  if (!o.defaults.allCaps) o.defaults.allCaps = 0;
  o.defaults.allCaps = o.defaults.allCaps ? 1 : 0;

  if (!o.defaults.songBookTitle) o.defaults.songBookTitle = '';

  // fix up the song oSongs
  Object.keys(o.oSongs).forEach(
    function (songName) {
      initSongValues(songName);
    }
  ); // oSongs 
}

function initSongValues(songName) {
  const o = songLibrary;
  const oSD = o.oSongs[songName];
  const aPageNames = Object.keys(oSD.oPages);

  // fix up song data values
  if (!oSD.RepeatCount) oSD.RepeatCount = 1;
  if (!oSD.TitleNote) oSD.TitleNote = '';
  if (!oSD.Notes) oSD.Notes = '';
  if (!oSD.Author) oSD.Author = '';
  if (!oSD.Publisher) oSD.Publisher = '';
  if (!oSD.License || oSD.License == songLibrary.defaults.License) oSD.License = '';
  console.assert(o.defaults.fontSize);
  if (!oSD.fontSize) oSD.fontSize = o.defaults.fontSize;
  console.assert(o.defaults.fontBoldness);
  if (!oSD.fontBoldness) oSD.fontBoldness = o.defaults.fontBoldness;
  console.assert(o.defaults.lineHeight);
  if (!oSD.lineHeight) oSD.lineHeight = o.defaults.lineHeight;
}

function getUnwoundPages(sd) {
  let aPageNamesUnwound = [];
  let cSongPagesUnwound = calcSongPageCount(sd);
  for (let iSongPage = 0; iSongPage < cSongPagesUnwound; iSongPage++) {
    aPageNamesUnwound[iSongPage] = sd.aPageOrder[iSongPage % sd.aPageOrder.length];
    if (sd.TagPage && iSongPage == cSongPagesUnwound - 1) {
      aPageNamesUnwound[iSongPage] = sd.TagPage;
      iSongPage++;
    }
  }
  return aPageNamesUnwound;
}

async function delay(timeInMilliseconds) {
  return new Promise(
      (resolve, reject) => {
          if (isNaN(timeInMilliseconds) || Math.floor(timeInMilliseconds) != timeInMilliseconds || timeInMilliseconds < 1) {
              reject('Time must be a positive integer.')
          } else {
              setTimeout(resolve, timeInMilliseconds);
          }
      }
  );
}

function progressBar(nHere, nTotal, fStartAt0=false) {
  console.assert(nHere <= nTotal);
  let str = '';
  for (let i = fStartAt0 ? 0 : 1; i <= nTotal; i++) {
    str += (i == nHere) ? `<b>${nHere}</b>` : '-';
  }
  return str;
}