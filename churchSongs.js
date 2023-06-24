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

  reRenderAllSongSelectControls('', '');

  // Nav init
  ge('chkNavSongSetMode').checked = true;

  // Nav formatting init
  ge('chkAllCaps').checked = songLibrary.defaults.allCaps ? 'checked' : '';
  ge('chkGenerateTitles').checked = !!songLibrary.defaults.generateTitle;

  // song editing init
  hide('spnVerseUpdatedNotice');
  initSongSetEditUI();
  initSongEditUI();
  fillSongToEdit();

  // AR UI init
  renderAspectRatioText();

  // hide sections we dont want to see initially
  toggleFieldsetVisibility({ target: ge('fsGeneralFormatting').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsCreateOrEditSongSet').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsCreateOrEditSong').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsExportImport').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsSearch').firstElementChild.firstElementChild });

  await delay(1);
  onShowSongSet();
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
    console.assert(nav.iSongInSet < nav.cSongsInSet);
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
  console.assert(Number.isInteger(nav.songData.RepeatCount));
  console.assert(nav.songData.RepeatCount > 0);
  for (let i = 0; i < nav.songData.RepeatCount; i++) {
    aPagesInSong = aPagesInSong.concat(nav.songData.aPageOrder);
  }
  if (nav.songData.TagPage) {
    aPagesInSong = aPagesInSong.concat([ nav.songData.TagPage ]);
  }
  nav.cPagesInSong = aPagesInSong.length;
  nav.pageName = aPagesInSong[nav.iPageInSong];
  nav.aPagesInSong = aPagesInSong;
  console.assert(nav.iPageInSong < nav.cPagesInSong);
  nav.fInReview = false;
  nav.fBlankScreen = g.nav.fBlankScreen;

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
    'btnNavPrevPage',
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
  g.nav.fBlankScreen = false;
  renderNavSection();
}

function renderNavStateText() {
  const nav = getNavState();
  const fIsSongSetMode = (nav.mode == 'songSet');
  let html = '';
  if (fIsSongSetMode) {
    html += `Song Set: "<i>${nav.songSetName}</i>"<br>`;
  }

  let songPos = '';
  let cSongs = 0;
  let pagePos = '';
  let cPages = 0;
  let sTotalPages = '';
  if (nav.fInReview) {
    html += `Reviewing: Song:<br><u>${getSongPagePairs()[nav.iPageInReview][0]}</u>`;
    cSongs = nav.cSongsInReview;
    songPos = `<b>${nav.iSongInReview + 1}</b> of ${nav.cSongsInReview}`;
  } else {
    html += `Projecting Song: <u>${nav.songName}</u>`;
    if (fIsSongSetMode) {
      cSongs = nav.cSongsInSet;
      songPos = `${progressBar(nav.iSongInSet + 1, nav.cSongsInSet)} of ${nav.cSongsInSet}`;
    }
  }

  html += '<br>';
  if (nav.fInReview) {
    pageName = nav.aSongPagePairs[nav.iPageInReview][1];
    html += `Page: "${pageName}"`;

    cPages = nav.cUniquePagesInSong;
    pagePos = `${progressBar(nav.iUniquePageInSong + 1, nav.cUniquePagesInSong)}`;
    sTotalPages = ` unique pages in the song.<br>page ${nav.iPageInReview + 1} of ${nav.cPagesInReview} review pages.`
  } else {
    let pageName = 
    (nav.songData.TagPage && (nav.iUniquePageInSong == nav.cUniquePagesInSong - 1)) 
    ?
    nav.songData.TagPage + ' {Tag}'
    :
    nav.pageName;
    html += `Page: "${pageName}"`;

    html += ` (${g.nav.fBlankScreen ? 'hidden' : 'showing'})`;
    cPages = nav.cPagesInSong;
    pagePos = `${progressBar(nav.iPageInSong + 1, nav.cPagesInSong)}`;
  }

  html += `<br>page ${pagePos} of ${cPages}${sTotalPages}`;
  if (nav.mode != 'song') {
    html += `<br>song ${songPos}`;
  }

  ge('divNavStateText').innerHTML = html;
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
  ge(idSel).innerHTML = htmlOptions;
  ge(idSel).value = selectedValue;
}

function enableNavButtons() {
  const nav = getNavState();
  if (nav.fInReview) {
    enableElement('btnPrevReviewSong', !isReviewingFirstSong());
    enableElement('btnNextReviewSong', !isReviewingLastSong())
    enableElement('btnPrevReviewPage', nav.iPageInReview > 0);
    enableElement('btnNextReviewPage', nav.iPageInReview < nav.cPagesInReview - 1);
  } else {
    enableElement('btnNavPrevSong', nav.iSongInSet > 0);
    enableElement('btnNextSong', nav.iSongInSet < nav.cSongsInSet - 1);
    enableElement('btnNavPrevPage', nav.iPageInSong > 0 || nav.iSongInSet > 0 || 
      songLibrary.defaults.generateTitle && g.nav.showTitlePage);
    enableElement('btnNavNextSongPage', nav.iPageInSong < nav.cPagesInSong - 1 || nav.iSongInSet < nav.cSongsInSet - 1);
  }
  show('btnPrevReviewSong', nav.fInReview);
  show('btnNavPrevSong', !nav.fInReview);
  show('btnPrevReviewPage', nav.fInReview);
  show('btnNextSong', !nav.fInReview);
  show('btnNextReviewPage', nav.fInReview);
  show('btnNavPrevPage', !nav.fInReview);
  show('btnNextReviewSong', nav.fInReview);
  show('btnNavNextSongPage', !nav.fInReview);
}

// navigation event handlers

function saveProjectorAspectRatio() {
  songLibrary.defaults.savedAspectRatio = 
    songLibrary.defaults.aspectRatio;
  renderAspectRatioText();
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
  console.assert(!nav.fInReview);
  g.nav.fBlankScreen = !nav.fInReview;
  renderNavSection();
  if (songLibrary.defaults.generateTitle) {
    g.nav.showTitlePage = true;
  }
}

function renderNavSection() {
  const oMsg = getMessageFromGlobals();
  localStorage.setItem('projector-message', JSON.stringify(oMsg));
  localStorage.clear();
  renderNavPagePreview();
  renderNavStateText();
  enableNavButtons();
  g.nav.showTitlePage = false;
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
  if (g.nav.fBlankScreen) {
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
  if (g.nav.iPageInSong == 0 && songLibrary.defaults.generateTitle) {
    if (!g.nav.showTitlePage) {
      g.nav.showTitlePage = true;
      renderNavSection();
      return; // stay at page 0
    } else {
      g.nav.showTitlePage = false;
      blankScreen();
    }
  }
  if (g.nav.iPageInSong > 0) {
    g.nav.iPageInSong--;
  } else {
    console.assert(g.nav.iSongInSet > 0);
    g.nav.iSongInSet--;
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
  if (nav.iPageInSong < nav.cPagesInSong - 1) {
    if (nav.iPageInSong == 0) {
      if (nav.fBlankScreen) {
        g.nav.fBlankScreen = false;
        if (songLibrary.defaults.generateTitle) {
          g.nav.showTitlePage = true;
        }
      } else if (g.nav.showTitlePage) {
        g.nav.showTitlePage = false;
      } else {
        g.nav.iPageInSong++;
      }
    } else {
      g.nav.iPageInSong++;
    }
  } else {
    console.assert(nav.iSongInSet < nav.cSongsInSet - 1);
    g.nav.fBlankScreen = false;
    g.nav.iPageInSong = 0;
    g.nav.iSongInSet++;
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
  if (nav.iSongInSet < nav.cPagesInSong - 1) {
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
    ge('divReviewStatus').innerText = 'No Review spot was saved to recall.';
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
      spaceAbove: songData.oPages[nav.pageName].spaceAbove, // em
      license: songData.License,
      pageNumber: nav.iUniquePageInSong + 1,
      cPagesInSong: nav.cUniquePagesInSong,
      songNumber: nav.iSongInReview + 1,
      cSongsInSet: nav.cSongsInReview,
    }
  } else {
    oMsg = {
      fontSize: nav.songData.fontSize,
      fontBoldness: nav.songData.fontBoldness,
      lineHeight: nav.songData.lineHeight,
      allCaps: songLibrary.defaults.allCaps,
      spaceAbove: nav.songData.oPages[nav.pageName].spaceAbove, // em
      license: nav.songData.License,
      pageNumber: nav.iPageInSong + 1,
      cPagesInSong: nav.cPagesInSong,
      songNumber: nav.iSongInSet + 1,
      cSongsInSet: nav.mode == 'song' ? 0 : nav.cSongsInSet,
      content: nav.fBlankScreen ? '' : nav.songData.oPages[nav.pageName]
    }
    if (g.nav.showTitlePage) {
      oMsg.content = `${nav.songName}<br><span class="smaller italic">${nav.songData.TitleNote}</span>`;
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
  nav.songData.lineHeight = fixit(nav.songData.lineHeight * 1.05, 3)
  renderNavSection();
}

function smallerLineHeight(event) {
  const nav = getNavState();
  nav.songData.lineHeight = fixit(nav.songData.lineHeight * .95, 3)
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

// Song Page formatting
function moveTextDown(event) {
  const nav = getNavState();
  nav.songData.oPageData[nav.pageName].spaceAbove =
    Number(nav.songData.oPageData[nav.pageName].spaceAbove) + .25; // em
  renderNavSection();
}

function moveTextUp(event) {
  const nav = getNavState();
  let newSpace = 
    Number(nav.songData.oPageData[nav.pageName].spaceAbove) - .25; // em
  if (newSpace < 0) {
    newSpace = 0;
  }
  nav.songData.oPageData[nav.pageName].spaceAbove = newSpace;
  renderNavSection();
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

async function deleteSongSet(event) {
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
  songLibrary.oSongSets[sses.newSongSetName] = songLibrary.oSongSets[sses.songSetNameToEdit];
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
    getSongSetEditState();
    renderSelectControl(
      'selCurrentSongSet',
      sses.aSongList, 
      sses.songNameToAdd);
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

async function moveSongDownInSongSet(event) {
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

async function deleteSongFromSongSet(event) {
  const sses = getSongSetEditState();
  sses.aSongsInSongSet.splice(sses.iSelectedSongInSet, 1);
  renderSelectControl(
    'selCurrentSongSet', 
    sses.aSongsInSongSet);
  editSelectedSongSet();
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
  onVerseOrderChanged();

  // other settings
  ge('txtNotes').value = 
    ses.songData.Notes ? ses.songData.Notes : '';
  ge('txtTitleNote').value = 
    ses.songData.TitleNote ? ses.songData.TitleNote : '';
  ge('txtAuthor').value = 
    ses.songData.Author ? ses.songData.Author : '';
  ge('txtPublisher').value = 
    ses.songData.Publisher ? ses.songData.Publisher : '';
  ge('txtLicense').value = 
    ses.songData.License ? ses.songData.License : '';
  ge('txtDefaultLicense').value = songLibrary.defaults.License;
  ge('selRepeatCount').value = 
    ses.songData.RepeatCount ? ses.songData.RepeatCount : 1;

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

async function createEmptySong(event) {
  const ses = getSongEditState();
  const sExistingSongName = 
    doesProposedEditSongNameExist(ses.newSongEditName);
  if (sExistingSongName) {
    setNewSongEditError(`The new song name you entered looks a lot like "${
      newSongEditName
      }" which already exists.`);
    return;
  }
  songLibrary.oSongs[ses.newSongEditName] = {
    oPages: {},
    aPageOrder: [],
    RepeatCount: 1
  };
  reRenderAllSongSelectControls();
  ge('txtEditSongFilter').value = '';
  ge('txtNewSongName').value = '';
  onNewSongFilterChanged();
  ge('selAllSongsToEdit').value = ses.newSongEditName;
  await delay(1);
  fillSongToEdit();
  ge('txtaVerseLines').value = '';
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

async function renameSong(event) {
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

function reRenderAllSongSelectControls(oldSongName, newSongName) {
  const fRename = 
    oldSongName && newSongName && oldSongName != newSongName;
  const fDelete = !oldSongName && !newSongName;

  const selectedNavSong = '';
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

async function deleteSong(event) {
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
  ge('chkIsTagVerse').checked = 
    ses.songData.TagPage == ses.pageName ? 'checked' : '';
  setSongVerseError('');
  renderOverallOrderText();
  enableSongEditVerseButtons(ses);
}

function renderOverallOrderText() {
  const ses = getSongEditState();
  const aPageNamesUnwound = getUnwoundPages(ses.songData);
  ge('tdOverallVerseOrder').innerHTML = 
    aPageNamesUnwound.length 
    ? 
    aPageNamesUnwound.join(' &#8594; ') 
    : 
    '';
}

function onVerseLinesChanged(event) {
  const ses = getSongEditState();
  ses.songData.oPages[ses.pageName] =
    ge('txtaVerseLines').value.split('\n');
  show('spnVerseUpdatedNotice');
  setTimeout(() => {
    hide('spnVerseUpdatedNotice');
  }, 1000);
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
  if (ses.songData.oPageData && ses.songData.oPageData[ses.pageName]) {
    delete ses.songData.oPageData[ses.pageName];
  }
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
  let results = `Results of searching for "${searchTerms}":\n`;
  if (searchTerms.length == 0) {
    // don't respond to empty or tiny search terms cuz almost
    // everything will hit.
    results = "You must enter a search filter string or a '*' to find all items."
  } else {
    const aSearchTokens = searchTerms.split(/\s+/);
    let resultPart = '';
    if (ge('chkSearchInSongSetNames').checked) {
      resultPart = 'In Song Set Names:\n';
      fResultFound = false;
      getAllSongSetNames().forEach(
        function(songSetName) {
          if (areAllTokensInText(aSearchTokens, songSetName)) {
            resultPart += `  ${songSetName}\n`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }
    }

    if (ge('chkSearchInSongSetSongNames').checked) {
      resultPart = 'In Song Set Song Names:\n';
      fResultFound = false;
      getAllSongSetNames().forEach(
        function(songSetName) {
          let thisResultPart = '';
          songLibrary.oSongSets[songSetName].forEach(
            function(songName) {
              if (areAllTokensInText(aSearchTokens, songName)) {
                thisResultPart += `    ${songName}\n`;
                fResultFound = true;
              }
            }
          );
          if (thisResultPart) {
            resultPart += `  ${songSetName}\n` + thisResultPart;
          }
        }
      );
      if (fResultFound) {
        results += resultPart;
      } 
    }

    if (ge('chkSearchInSongNames').checked) {
      resultPart = 'In Song Names:\n';
      fResultFound = false;
      getAllSongNames().forEach(
        function(songName) {
          if (areAllTokensInText(aSearchTokens, songName)) {
            resultPart += `  ${songName}\n`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }
    }

    if (ge('chkSearchLyrics').checked) {
      resultPart = 'In Song Lyrics:\n';
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
                  resultPart += `  Song:"${oSongKV[0]}"\n`;
                }
                resultPart += `    Verse: "${aPageKV[0]}"\n`;
                aPageKV[1].forEach(
                  function(lyricLine) {
                    if (areAllTokensInText(aSearchTokens, lyricLine)) {
                      resultPart += `      ${lyricLine}\n`;
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
      resultPart = 'In Song Notes:\n';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].Notes)) {
            resultPart += `  Song:"${oSongKV[0]}"\n    ${oSongKV[1].Notes}\n`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }
    }
    if (ge('chkSearchAuthor').checked) {
      resultPart = 'In Song Authors:\n';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].Author)) {
            resultPart += `  Song:"${oSongKV[0]}"\n    ${oSongKV[1].Author}\n`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }  
    }
    if (ge('chkSearchPublisher').checked) {
      resultPart = 'In Song Publshers:\n';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].Publisher)) {
            resultPart += `  Song:"${oSongKV[0]}"\n    ${oSongKV[1].Publisher}\n`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }   
    }
    if (ge('chkSearchLicense').checked) {
      resultPart = 'In Song Licenses:\n';
      fResultFound = false;
      getAllSongEntries().forEach(
        function(oSongKV) {
          if (areAllTokensInText(aSearchTokens, oSongKV[1].License)) {
            resultPart += `  Song:"${oSongKV[0]}"\n    ${oSongKV[1].License}\n`;
            fResultFound = true;
          }
        }
      )
      if (fResultFound) {
        results += resultPart;
      }   
    }
  }

  ge('txtaSearchResults').value = results;
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
  const sOut = JSON.stringify(songLibrary, null, 2);
  ge('txtaImportExport').value = sOut;
}

async function importLibrary(event) {
  let sIn = ge('txtaImportExport').value;
  try {
    songLibrary = JSON.parse(sIn);
    await onPageLoad();
  } catch(error) {
    ge('txtaImportExport').value = error.message;
  }
}

// printing

/**
 * This expects either songSetName OR songName to be a string
 * while the other is ''. 
 * It prints either an entire song-set or just one song.
 * @param {string} songSetName 
 * @param {string} songName 
 */
function onPrintSongs(event) {
  const nav = getNavState();
  setSongSetError('');

  // save the body html to restore later
  const htmlBodySaved = document.body.innerHTML;

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
    replace(/%numPages%/g, iPrintPage);


  document.body.innerHTML = htmlPrint;
  window.print();
  document.body.innerHTML = htmlBodySaved;
}

function prepPrint(
  songName, 
  iSongInSet, 
  iPrintPage, 
  oHtmlPrint, 
  cSongsInSet,
  nav) {

  // pull our invisible print template out of the body.
  const htmlTemplate = ge('divPrintArea').innerHTML;

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
    replace(/%pageNumber%/, printPageNumber + iPrintPage).
    replace(/%pageName-\d+%/g, '').
    replace(/%pageLines-\d+%/g, '');

  return printPageNumber + iPrintPage;
} // prepPrint

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
          // console.log(`Checking song "${songSetSongName}" referenced by song set "${songSetName}".`)
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
          // console.log(`Checking song "${songName}" song order reference ${pageOrderPageName}.`);
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
      const oSD = o.oSongs[songName];
      const aPageNames = Object.keys(oSD.oPages);

      // fix up oPageData values
      if (!oSD.RepeatCount) oSD.RepeatCount = 1;
      if (!oSD.TitleNote) oSD.TitleNote = '';
      if (!oSD.Notes) oSD.Notes = '';
      if (!oSD.Author) oSD.Author = '';
      if (!oSD.Publisher) oSD.Publisher = '';
      if (!oSD.License) oSD.License = songLibrary.defaults.License;
      if (!oSD.oPageData) oSD.oPageData = {};
      if (!oSD.fontSize) oSD.fontSize = o.defaults.fontSize;
      if (!oSD.fontBoldness) oSD.fontBoldness = o.defaults.fontBoldness;
      if (!oSD.lineHeight) oSD.lineHeight = o.defaults.lineHeight;
      aPageNames.forEach(
        function (pageName) {
          // fix up per-page data
          let oPD = oSD.oPageData[pageName];
          if (!oPD) oPD = oSD.oPageData[pageName] = {};
          if (!oPD.spaceAbove) {
            oPD.spaceAbove = 0;
          }
        }
      )
    }
  ); // oSongs 
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

function progressBar(nHere, nTotal) {
  console.assert(nHere <= nTotal);
  let str = '';
  for (let i = 1; i <= nTotal; i++) {
    str += (i == nHere) ? `<b>${nHere}</b>` : '-';
  }
  return str;
}