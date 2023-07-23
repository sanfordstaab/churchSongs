// churchSongs.js

async function onPageLoad(event) {
  onstorage = (event) => {
    if (event.key == 'projectorKeyup' && event.newValue != null) {
      processKeyCode(event.newValue);
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
      ge('chkNavReviewMode').checked = 'checked';
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
  // mode switching just sets all pages back to 0 for consistency.
  g.nav.iPageInSong = 
  g.nav.iSongInSet = 
  g.nav.iPageInReview = 0;
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
    html += `Song Set: "<i>${nav.songSetName}</i>"<br>`;
  }

  let songPos = '';
  let cSongs = 0;
  let pagePos = '';
  let cPages = 0;
  let sTotalPages = '';
  if (nav.fInReview) {
    html += `Reviewing: Song:<br><b>${getSongPagePairs()[nav.iPageInReview][0]}</b>`;
    cSongs = nav.cSongsInReview;
    songPos = `<b>${nav.iSongInReview + 1}</b> of ${nav.cSongsInReview}`;
  } else {
    html += `Song:<b>${nav.songName}</b>`;
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
    pagePos = progressBar(
      nav.showTitlePage ? 0 : nav.iPageInSong + 1, 
      nav.cPagesInSong, 
      songLibrary.defaults.generateTitle);
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
  let fAllowDefault = false;
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
      // if (document.querySelector(':focus').tagName == 'button') {
      //   break;  // do nothing if a button has the focus.
      // }
      toggleBlankScreen();
      break;
    
    default:
      fAllowDefault = true;
      break;
  }

  return !fAllowDefault;
}

function processARChanged(newAspectRatio) {
  if (songLibrary.defaults.aspectRatio != newAspectRatio) {
    songLibrary.defaults.aspectRatio = newAspectRatio;
    renderAspectRatioText();
    renderNavPagePreview();
  }
}

function setNavSongSetByName(songSetName) {
  const nav = getNavState();
  console.assert(nav.mode == 'songSet');
  console.assert(Object.keys(songLibrary.oSongSets).includes(songSetName));
  ge('selNavSongSets').value = songSetName;
  setNavSongSetSongIndex(0);
}

function setNavSongSetSongIndex(iSongInSet) {
  setNavPage(0);
  g.nav.iSongInSet = iSongInSet;
  blankScreen();
}

function setNavSongUI(songName) {
  ge('selNavSongs').value = songName; 
  setNavPage(0);
  blankScreen();
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

function setNavPage(iPage) {
  const nav = getNavState();
  if (nav.fInReview) {
    if (iPage < 0 || iPage >= nav.cPagesInReview) {
      iPage = 0;
      g.nav.iPageInSong = iPage;
      return;
    }
  } else {
    if (iPage < 0 || iPage >= nav.cPagesInSong) {
      iPage = 0;
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
    enableElement('btnNavPrevSongPage', fSongsInSet && !nav.fBlankScreen);
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
    enableElement('btnNavPrevSongPage', !nav.fBlankScreen);
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
  localStorage.clear();
}

function blankScreen(event) {
  const nav = getNavState();
  g.nav.fBlankScreen = !nav.fInReview;
  renderNavSection();
}

function renderNavSection() {
  if (getNavState().songData) {
    const oMsg = getMessageFromGlobals();
    localStorage.setItem('projector-message', JSON.stringify(oMsg));
    localStorage.clear();
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
  renderNavSection();
}

function prevPage(event) {
  if (getNavState().fInReview) {
    prevReviewPage();
  } else {
    prevSongPage();
  }
  renderNavSection();
}

function prevSongPage() {
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
    g.nav.iPageInSong--;
  } else {
    if (g.nav.iSongInSet > 0) {
      g.nav.iSongInSet--;
    }
  }
  renderNavSection();
}

function prevReviewPage() {
  const nav = getNavState();
  console.assert(nav.fInReview);
  if (nav.iPageInReview > 0) {
    // note that the keyboard method of navigation can get here
    // despite the button being disabled
    g.nav.iPageInReview--;
    renderNavSection();
  }
}

function nextPage() {
  if (getNavState().fInReview) {
    nextReviewPage();
  } else {
    nextSongPage();
  }
  renderNavSection();
}

function nextSongPage(event) {
  const nav = getNavState();
  console.assert(!nav.fInReview);
  if (nav.iPageInSong < nav.cPagesInSong - 1 ||
      nav.iPageInSong == 0) {
    if (nav.iPageInSong == 0) {
      if (nav.fBlankScreen) {
        g.nav.fBlankScreen = false;
        g.nav.showTitlePage = songLibrary.defaults.generateTitle;
        // don't advance - show first page or title
      } else if (g.nav.showTitlePage) {
        g.nav.showTitlePage = false;
        // don't advance - show first page
      } else if (nav.iPageInSong < nav.cPagesInSong - 1) {
        g.nav.iPageInSong++;
      }
    } else {
      g.nav.iPageInSong++;
    }
  } else if (nav.iSongInSet < nav.cSongsInSet - 1) {
    // advance to the next song, first page, blank screen.
    g.nav.iSongInSet++;
    g.nav.iPageInSong = 0;
    g.nav.fBlankScreen = true;
  }
  renderNavSection();
}

function nextReviewPage() {
  const nav = getNavState();
  console.assert(nav.fInReview);
  console.assert(nav.aSongPagePairs.length);
  if (nav.iPageInReview < nav.aSongPagePairs.length - 1) {
    // note that the keyboard method can get here despite
    // the fact that the button is disabled
    g.nav.iPageInReview++;
    renderNavSection();
  }
}

function prevSong(event) {
  const nav = getNavState();
  if (nav.fInReview) {
    prevReviewSong();
  } else {
    prevSongInSet();
  }
}

function prevSongInSet() {
  const nav = getNavState();
  if (nav.iSongInSet > 0) {
    // the keyboard
    nav.iSongInSet--;
    setNavSongSetSongIndex(nav.iSongInSet);
  }
}

function prevReviewSong(event) {
  const nav = getNavState();
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
  if (getNavState().fInReview) {
    nextReviewSong();
  } else {
    nextSongInSet();
  }
}

function nextSongInSet(event) {
  const nav = getNavState();
  console.assert(!nav.fInReview);
  if (nav.iSongInSet < nav.cSongsInSet - 1) {
    // the keyboard method can get us here despite
    // the button being disabled.
    setNavSongSetSongIndex(nav.iSongInSet + 1);
    blankScreen();  
  }
}

function nextReviewSong(event) {
  const nav = getNavState();
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

function restoreSavedReviewPlace(event) {
  if (songLibrary.defaults.lastReviewPage) {
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

// navigation utilities

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
      license: songData.License,
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
      license: nav.songData.License,
      pageNumber: (nav.iPageInSong == 0 && (nav.fBlankScreen || nav.showTitlePage))
        ? 0 : nav.iPageInSong + 1,
      cPagesInSong: nav.cPagesInSong,
      songNumber: nav.iSongInSet + 1,
      cSongsInSet: nav.mode == 'song' ? 0 : nav.cSongsInSet,
      content: nav.fBlankScreen ? '' : nav.songData.oPages[nav.pageName],
    }
    if (g.nav.showTitlePage) {
      oMsg.content = `<span style="color: lightblue;">${
        removeVersion(nav.songName)
        }</span><br><span class="pageTitle">${
          nav.songData.TitleNote
        }</span>`;
    }
      
  }
  return oMsg;
}

function removeVersion(str) {
  // str may have a trailing "(...)" which is the song version which
  // we remove for the title page.
  return str.replace(/\s*\(.*\)$/, '');
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
    'spnNoSongsToEdit');
  ge('txtNewSongName').value = '';

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

function addSongToNewSongSet(event) {
  const sses = getSongSetEditState();
  console.assert(sses.songNameToAdd, 'UI should not let this happen.');
  if (sses.aSongList.includes(sses.songNameToAdd)) {
    setSongSetError('That song is already in your list.');
  } else {
    sses.aSongList.push(sses.songNameToAdd);
    if (sses.aSongList[0] == '') {
      sses.aSongList.shift();
    }
    songLibrary.oSongSets[sses.songSetNameToEdit] = sses.aSongList;
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
}

function deleteSongFromSongSet(event) {
  const sses = getSongSetEditState();
  sses.aSongsInSongSet.splice(sses.iSelectedSongInSet, 1);
  renderSelectControl(
    'selCurrentSongSet', 
    sses.aSongsInSongSet);
  editSelectedSongSet();
  checkForEmptySongsOrSongSets();
}

// Edit or Create a Song

function initSongEditUI() {
  setNewSongEditError('');
  fillSongToEdit();
}

function fillSongToEdit(event) {
  const ses = getSongEditState();
  setSongVerseError('');

  // fill in all edit fields related to the selected song
  ge('txtNewSongName').value = '';
  renderSelectControl(
    'selSongVersesToEdit',
    ses.aPageNames, 
    ge('selSongVersesToEdit').value);
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
    ge('selRepeatCount').value = 
      sd.RepeatCount ? sd.RepeatCount : 1;
  } else {
    ge('txtNotes').value = '';
    ge('txtTitleNote').value = '';
    ge('txtAuthor').value = '';
    ge('txtPublisher').value = '';
    ge('txtLicense').value = '';
    ge('txtDefaultLicense').value = songLibrary.defaults.License;
    ge('selRepeatCount').value = 1;
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
  ses.songData.License = ge('txtLicense').value.trim();
}

function onDefaultLicenseChanged(event) {
  const ses = getSongEditState();
  songLibrary.License = ge('txtDefaultLicense').value.trim();  
}

function setNewSongEditError(text) {
  ge('divNewEditSongNameError').value = text;
}

function onNewSongNameChanged(event) {
  clearSongUI();
  enableSongEditButtons();
}

function onNewSongFilterChanged(event) {
  const cSongs = renderSongDropDown(
    'selAllSongsToEdit', 
    'txtEditSongFilter', 
    '', 
    'spnNoSongsToEdit');
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
  ses.newSongEditName = ge('txtNewSongName').value.trim();
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
  hide('spnNoSongsToEdit'); // clear any previous errors

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
    show('spnNoSongsToEdit');
    ge('spnNoSongsToEdit').innerText = 
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
  ge('txtNewSongName').value = '';
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
    songLibrary.oSongs[newSongName] = songLibrary.oSongs[oldSongName];
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
    'spnNoSongsToEdit');
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
        ses.selectedOrderVerseIdx 
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
  const html = getOverallOrderTextHTML(ses.songData, ' &#8594; ');
  ge('tdOverallVerseOrder').innerHTML = html;
}

function getOverallOrderTextHTML(sd, separator) {
  const aPageNamesUnwound = getUnwoundPages(sd);
  return(
    aPageNamesUnwound.length 
    ? 
    aPageNamesUnwound.join(separator) 
    : 
    '');
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
    delete ses.songData.aPageOrder[ses.songData.aPageOrder.indexOf(ses.pageName)];
  }
  if (ses.songData.TagPage == ses.pageName) {
    ses.songData.TagPage = '';
  }
  delete ses.songData.oPages[ses.pageName];
  fillSongToEdit();
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
  ge('selSongVerseOrder').value;
  if (undefined == ses.selectedOrderVerseIdx) {
    ses.songData.aPageOrder.push(ses.pageName);
  } else {
    ses.songData.aPageOrder.splice(ses.selectedOrderVerseIdx + 1, 0, ses.pageName);
  }
  fillSongToEdit();  
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
  ge('chkSearchAuthor').checked = '';
  ge('chkSearchPublisher').checked = '';
  ge('chkSearchLicense').checked = '';
  onSearchInChanged();
}

function onSearchInChanged(event) {
  const searchTerms = 
    ge('txtSearchFor').value.trim().toLocaleLowerCase();
  let results = `Results of searching for "${searchTerms}":<br>`;
  if (searchTerms.length == 0) {
    // don't respond to empty or tiny search terms cuz almost
    // everything will hit.
    results = "You must enter a search filter string or a '*' to find all items."
  } else {
    const aSearchTokens = searchTerms.split(/\s+/);
    let resultPart = '';
    if (ge('chkSearchInSongSetNames').checked) {
      resultPart = 'In Song Set Names:<br>';
      fResultFound = false;
      getAllSongSetNames().forEach(
        function(songSetName) {
          if (areAllTokensInText(aSearchTokens, songSetName)) {
            resultPart += `&nbsp;&nbsp;${getSongSetEditImage(songSetName)}${songSetName}<br>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }
    }

    if (ge('chkSearchInSongSetSongNames').checked) {
      resultPart = 'In Song Set Song Names:<br>';
      fResultFound = false;
      getAllSongSetNames().forEach(
        function(songSetName) {
          let thisResultPart = '';
          songLibrary.oSongSets[songSetName].forEach(
            function(songName) {
              if (areAllTokensInText(aSearchTokens, songName)) {
                thisResultPart += `&nbsp;&nbsp;&nbsp;&nbsp;${getSongEditImage(songSetName)}${songName}<br>`;
                fResultFound = true;
              }
            }
          );
          if (thisResultPart) {
            resultPart += `&nbsp;&nbsp;${getSongSetEditImage(songSetName)}${songSetName}<br>` + thisResultPart;
          }
        }
      );
      if (fResultFound) {
        results += resultPart;
      } 
    }

    if (ge('chkSearchInSongNames').checked) {
      resultPart = 'In Song Names:<br>';
      fResultFound = false;
      getAllSongNames().forEach(
        function(songName) {
          if (areAllTokensInText(aSearchTokens, songName)) {
            resultPart += `&nbsp;&nbsp;${getSongEditImage(songName)}${songName}<br>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }
    }

    if (ge('chkSearchLyrics').checked) {
      resultPart = 'In Song Lyrics:<br>';
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
              )              
              if (fLineFits) {
                if (prevSongName != oSongKV[0]) {
                  prevSongName = oSongKV[0];
                  resultPart += `  Song:${getSongEditVerseImage(oSongKV[0])} "${oSongKV[0]}"<br>`;
                }
                resultPart += `    Verse:${getSongEditVerseImage(oSongKV[0], aPageKV[0])} "${aPageKV[0]}"<br>`;
                aPageKV[1].forEach(
                  function(lyricLine) {
                    if (areAllTokensInText(aSearchTokens, lyricLine)) {
                      resultPart += `  &nbsp;&nbsp;&nbsp;&nbsp;${lyricLine}<br>`;
                      fResultFound = true;
                    }
                  }
                )
              }
            }
          )
        }
      )
      if (fResultFound) {
        results += resultPart;
      }
    }
    if (ge('chkSearchNotes').checked) {
      resultPart = 'In Song Notes:<br>';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].Notes)) {
            resultPart += `  Song: ${getSongEditImage(oSongKV[0])}"${oSongKV[0]}"<br>&nbsp;&nbsp;&nbsp;&nbsp;${oSongKV[1].Notes}<br>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }
    }
    if (ge('chkSearchAuthor').checked) {
      resultPart = 'In Song Authors:<br>';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].Author)) {
            resultPart += `  Song: ${getSongEditImage(oSongKV[0])}"${oSongKV[0]}"<br>&nbsp;&nbsp;&nbsp;&nbsp;${oSongKV[1].Author}<br>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }  
    }
    if (ge('chkSearchPublisher').checked) {
      resultPart = 'In Song Publshers:<br>';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].Publisher)) {
            resultPart += `  Song: ${getSongEditImage(oSongKV[0])}"${oSongKV[0]}"<br>&nbsp;&nbsp;&nbsp;&nbsp;${oSongKV[1].Publisher}<br>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }   
    }
    if (ge('chkSearchLicense').checked) {
      resultPart = 'In Song Licenses:<br>';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].License)) {
            resultPart += `  Song: ${getSongEditImage(oSongKV[0])}"${oSongKV[0]}"<br>&nbsp;&nbsp;&nbsp;&nbsp;${oSongKV[1].License}<br>`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }   
    }
  }

  ge('divSearchResults').innerHTML = results;
}

function getSongSetEditImage(songSetName) {
  return `<a onclick="editSongSet('${
    songSetName
  }');"><img src="img/edit.jpg" 
  class="editBtn CreateOrEditSongSetBG" 
  title="Edit this Song Set">
  </a>&nbsp;`;
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

function getSongEditImage(songName) {
  return `<a onclick="editSong('${
    songName
    }');"><img src="img/edit.jpg" 
    class="editBtn CreateOrEditSongBG" 
    title="Edit this Song"/>
    </a>&nbsp;`;
}

function getSongEditVerseImage(songName, verseName) {  
  return `<a onclick="editSong('${
    songName
  }', '${
    verseName
  }');"><img src="img/edit.jpg" 
  class="editBtn CreateOrEditSongBG" 
  title="Edit this Song and Verse"/>
  </a>&nbsp;`;
  
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

function exportLibrary(event) {
  ge('divImportExportError').innerText = '';
  const sOut = JSON.stringify(songLibrary, null, 2);
  ge('txtaImportExport').value = sOut;
}

function importLibrary(event) {
  let sIn = ge('txtaImportExport').value;
  importLibraryFromText(sIn);
}

function importLibraryFromText(text) {
  const elError = ge('divImportExportError');
  elError.innerText = '';
  let o = {};
  try {
    o = JSON.parse(text);
  } catch(error) {
    elError.classList.remove('greenText');
    elError.classList.add('redText');
    elError.innerText = error.message;
    return;
  }
  if (!o.oSongs || !o.oSongSets || !o.defaults) {
    elError.classList.remove('greenText');
    elError.classList.add('redText');
    elError.innerText = `The imported data does not appear to be a proper song library.`;
    return;
  }
  songLibrary = o;
  initSiteUI();
  elError.classList.add('greenText');
  elError.classList.remove('redText');
  elError.innerText = 'Successfully imported song library data.';
}

function importDrop(event, el) {
  event.preventDefault();
  dropFile(event.dataTransfer.files[0], el);
}

function dropFile(file, el) {
  var reader = new FileReader();
  reader.onload = function(e) {
    el.value = e.target.result;
    importLibraryFromText(el.value);
  };
  reader.readAsText(file, "UTF-8");
}

function importFromFile(el) {
  const file = el.files[0];
  const reader = new FileReader();
  reader.onloadend = function(event) {
    if (event.target.readyState == FileReader.DONE) { 
      const sJson = event.target.result;
      ge('txtaImportExport').value = sJson;
      importLibraryFromText(sJson);
    }
  }
  reader.readAsText(file, "UTF-8");
}


// printing

/**
 * This expects either songSetName OR songName to be a string
 * while the other is ''. 
 * It prints either an entire song-set or just one song.
 * @param {string} songSetName 
 * @param {string} songName 
 */
function printNavModeData(event) {
  const nav = getNavState();

  setSongSetError('');

  let htmlPrint = '';
  let iPrintPage = 0;

  if (nav.mode == 'songSet') {
    nav.aSongsInSet.forEach(
      function(songName, iSongInSet) {
        const oHtmlPrint = { htmlPrint: htmlPrint };
        iPrintPage = prepPrint(
          songName, 
          iSongInSet, 
          iPrintPage, 
          oHtmlPrint, // so we pass by reference
          nav.cSongsInSet,
          nav);
        htmlPrint = oHtmlPrint.htmlPrint;
      }
    );
  } else if (nav.mode == 'review') {
    htmlPrint = getPrintReviewHTML();
  } else { // song mode
    ge('divPrintSongError').innerText = '';
    const oHtmlPrint = { htmlPrint: htmlPrint };
    iPrintPage = prepPrint(
      nav.songName, 
      -1, 
      iPrintPage,
      oHtmlPrint, 
      0,
      nav);
    htmlPrint = oHtmlPrint.htmlPrint;
  }

  // substitute in the total number of pages which we saved for last
  htmlPrint = htmlPrint.
    replace(/%totalPrintPages%/g, iPrintPage);

  const htmlBodySaved = document.body.innerHTML;
  document.body.innerHTML = htmlPrint;
  window.print();

  // restore html
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

}

function prepPrint(
  songName, 
  iSongInSet, 
  iPrintPage, 
  oHtmlPrint, 
  cSongsInSet,
  nav) {

  // pull our invisible print template out of the body.
  const htmlTemplate = `
<div id="divPrintArea">
  <table id="tblPrint" class="pgBrk">
    <tr class="topRow">
      <td colspan="100%" class="ac">
        <h4 class="m0">%songName%</h4>
      </td>
    </tr>

    <tr>
      <td class="verseCell">
        <h6>%pageName-1%</h6>
        <div class="divIndent">%pageLines-1%</div>
      </td>
      <td class="verseCell">
        <h6>%pageName-5%</h6>
        <div class="divIndent">%pageLines-5%</div>
      </td>          
    </tr>

    <tr>
      <td class="verseCell">
        <h6>%pageName-2%</h6>
        <div class="divIndent">%pageLines-2%</div>
      </td>
      <td class="verseCell">
        <h6>%pageName-6%</h6>
        <div class="divIndent">%pageLines-6%</div>
      </td>          
    </tr>

    <tr>
      <td class="verseCell">
        <h6>%pageName-3%</h6>
        <div class="divIndent">%pageLines-3%</div>
      </td>
      <td class="verseCell">
        <h6>%pageName-7%</h6>
        <div class="divIndent">%pageLines-7%</div>
      </td>          
    </tr>

    <tr>
      <td class="verseCell">
        <h6>%pageName-4%</h6>
        <div class="divIndent">%pageLines-4%</div>
      </td>
      <td class="verseCell">
        <h6>%pageName-8%</h6>
        <div class="divIndent">%pageLines-8%</div>
      </td>          
    </tr>
    <tr>
      <td colspan="2" width="100%">
        <table width="100%">
          <br>
          <tr class="trBottomInfo">
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

  // reference songData with a nice short name
  const sd = songLibrary.oSongs[songName];

  // build htmlPageTemplate which has all the values common to all print pages
  let htmlPageTemplate = htmlTemplate.
    replace(/%Publisher%/, sd.Publisher).
    replace(/%Author%/, sd.Author).
    replace(/%Notes%/, sd.Notes).
    replace(/%License%/, sd.License);

  if (nav.mode == 'song') {
    htmlPageTemplate = htmlPageTemplate.
      replace(/%songName%/, songName);
  } else if (nav.mode == 'songSet') {
    htmlPageTemplate = htmlPageTemplate.
      replace(/%songName%/, `${songName} (Song ${iSongInSet + 1} of ${cSongsInSet})`);
  } else {
    // review mode TODO
  }

  // start with the first print page
  let printPageNumber = 1;
  
  let htmlPage = htmlPageTemplate;
  const aUnwoundPages = getUnwoundPages(sd);
  const cPagesInSong = nav.fInReview ? nav.cUniquePagesInSong : aUnwoundPages.length;
  for (let iPageInSong = 0; iPageInSong < cPagesInSong; iPageInSong++) {
    const nSongThisPage = (iPageInSong % 8) + 1; // 1 based index
    const pageName = aUnwoundPages[iPageInSong];
    const pageLines = sd.oPages[pageName];
    const rxPageNameKey = new RegExp(`%pageName-${nSongThisPage}%`, 'g');
    const rxPageLinesKey = new RegExp(`%pageLines-${nSongThisPage}%`, 'g');

    // fill in each song page's data
    htmlPage = htmlPage.
      replace(rxPageNameKey, `Page ${iPageInSong + 1}) ${pageName}:`).
      replace(rxPageLinesKey, pageLines.join('\n<br>\n'));

    if (nSongThisPage == 8 || iPageInSong == cPagesInSong - 1) {
      // We have completed all 8 (or the last) page of the song pages on this print page.
      // Go on to the next print page.
      oHtmlPrint.htmlPrint += htmlPage.
        replace(/%pageNumber%/, printPageNumber + iPrintPage);
      htmlPage = htmlPageTemplate;
      printPageNumber++;
    }
  }

  // set last page's page number
  oHtmlPrint.htmlPrint = oHtmlPrint.htmlPrint.
    replace(/%pageNumber%/, printPageNumber - 1 + iPrintPage).
    replace(/%pageName-\d+%/g, '').
    replace(/%pageLines-\d+%/g, '');

  return printPageNumber - 1 + iPrintPage;
} // prepPrint

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
      html += getOverallOrderTextHTML(sd, '<br>&nbsp;&nbsp;');

      html += '<br><br>Other Values:<ul>';
      html += `<li>Title Note: [${sd.TitleNote}]</li>`;
      html += `<li>Notes: [${sd.Notes}]</li>`;
      html += `<li>Author: [${sd.Author}]</li>`;
      html += `<li>Publisher: [${sd.Publisher}]</li>`;
      html += `<li>Repeat Count: [${sd.RepeatCount}]</li>`;
      html += `<li>License: [${sd.License ? sd.License : songLibrary.defaults.License}]</li>`;
      html += '</ul>';

      html += '</div>'; // flexItem
    }
  );

  html += '</div>'; // flexContainer

  return html;
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
  if (!selectedSongSetName) {
    selectedSongSetName = aSongSetNames[0];
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
  if (!selectedSongName) {
    selectedSongName = aSongNames[0];
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
  if (!filterText.trim()) {
    return aText;
  }
  return aText.filter(
    function (text) {
      aTokens = text.toLocaleLowerCase().split(/\s+/);
      aFilterTokens = filterText.toLocaleLowerCase().split(/\s+/);
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
  if (!oSD.License) oSD.License = songLibrary.defaults.License;
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
      iSongPage++;
      aPageNamesUnwound[iSongPage] = sd.TagPage;
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