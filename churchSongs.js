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

  // check for common mistakes when manually editing the data
  checkSongLibrary();

  // flesh out any missing fields for clarity and simplicity of code
  healSongLibrary();

  // iSongSet is simply an index into getAllSongSetNames() for the 
  // currently selected song set.
  g.iSongInSet = getAllSongSetNames().length ? 0 : -1;

  renderAllSongs(
    'selNavSongs', 
    'txtNavSongFilter', 
    '', 
    'spnNoSongsDefined');

  // show the select control if we have any song sets to pick from
  show('selNavSongSets', getAllSongSetNames().length);
  // show the span that says no song sets are defined if appropriate.
  show('spnNoSongSets', !getAllSongSetNames().length);

  if (getAllSongSetNames().length) {
    setNavSongSet(getAllSongSetNames()[g.iSongInSet]);
  } else {
    setNavSong(getAllSongNames()[0]);
  }

  ge('chkNavSongChosen').checked = 'checked';

  renderAllSongSets(
    'selNavSongSets', 
    'txtNavSongSetFilter', 
    '',
    'spnNoSongSets');

  renderAllSongSets(
    'selAllSongSetsToEdit', 
    'txtSongSetEditFilter',
    '',
    'spnNoSongSetsToEdit');

  renderAllSongs(
    'selNavSongs', 
    'txtNavSongFilter',
    '',
    'spnNoSongsDefined');

  renderAllSongs(
    'selFilteredSongsToAdd', 
    'txtSongSetAddSongFilter',
    '',
    'spnNoSongsToAddToSongSet');

  renderNavState();
  enableNavButtons();

  initSongSetEditUI();
  initSongEditUI();
  fillSongToEdit();

  ge('chkAllCaps').checked = songLibrary.defaults.allCaps ? 'checked' : '';

  getSongSetEditState();

  // hide sections we 
  toggleFieldsetVisibility({ target: ge('fsGeneralFormatting').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsCreateOrEditSongSet').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsCreateOrEditSong').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsExportImport').firstElementChild.firstElementChild });
  toggleFieldsetVisibility({ target: ge('fsSearch').firstElementChild.firstElementChild });
}

// projector

g.iNextProjector = 1;
function openProjector(event) {
  window.open(`./projector.html?id=${g.iNextProjector++}`, '_blank'); 
}

// Song and Song Set Selection for Printing or Projecting

async function onNavSongSetFilterChanged(event) {
  renderAllSongSets(
    'selNavSongSets',
    'txtNavSongSetFilter',
    '',
    'spnNoSongSets'
    )
}

async function onNavSongFilterChanged(event) {
  renderAllSongs(
    'selNavSongs', 
    'txtNavSongFilter', 
    '', 
    'spnNoSongsDefined');
}

function onShowSong(event) {
  ge('chkNavSongChosen').checked = true;
  onShowSongOrSongset();
}

function onShowSongset(event) {
  ge('chkNavSongSetChosen').checked = true;
  onShowSongOrSongset();  
}

function onShowSongOrSongset() {
  if (ge('chkNavSongChosen').checked) {
    setNavSong(ge('selNavSongs').value);
  } else {
    setNavSongSet(ge('selNavSongSets').value);
  }
}

function renderNavState() {
  show('spnSongSetSection', ge('chkNavSongSetChosen').checked);
  show('spnSongsInSetSection', ge('chkNavSongSetChosen').checked);
  
  ge('spnNavSongSetName').innerText = g.songSetName;
  ge('spnNavSongName').innerText = g.songName;
  ge('spnNavISongSet').innerText = g.iSongInSet + 1;
  ge('spnNavCSongs').innerText = getCountOfSongsInSongSet(g.songSetName) ? getCountOfSongsInSongSet(g.songSetName) : 0;
  ge('spnNavIPage').innerText = g.iPage + 1;
  const pageName = 
    (g.songData.TagPage && (g.iPage == g.cPages - 1)) 
    ?
    g.songData.TagPage + ' {Tag}'
    :
    g.pageName;
  ge('spnNavPageName').innerText = pageName;
  ge('spnNavIsShowing').innerText = g.isScreenBlank ? 'hidden' : 'showing';
  ge('spnNavCPages').innerText = g.cPages;
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
      if (g.isScreenBlank) {
        renderNavPage();
      } else {
        blankScreen();
      }
      break;
    
    default:
      fAllowDefault = true;
      break;
  }

  return !fAllowDefault;
}

function processARChanged(newAspectRatio) {
  if (g.aspectRatio != newAspectRatio) {
    g.aspectRatio = newAspectRatio;
    renderNavPagePreview();
  }
}

function setNavSongSet(songSetName) {
  g.songSetName = songSetName;
  if (!g.songSetName) {

    if (getAllSongNames().length == 0) {
      // no songs defined, do nothing
      g.iSongInSet = -1;
      g.songSetName = '';
      return;
    }

    // add/modify the one off song set in the library to contain
    // just the selected song.
    songLibrary.oSongSets['One Off Song Set'] = [ g.songName ];

    // set everything up straight
    renderAllSongSets(
      'selNavSongSets', 
      'txtSongSetAddSongFilter',
      '',
      'spnNoSongSets');
    renderNavState();
    enableNavButtons();
    return;
  }
  // start at first song in the set
  g.iSongInSet = 0;
  g.songSetName = songSetName;
  setNavSongInSet(g.iSongInSet)
}

function setNavSongInSet(iSongInSet) {
  console.assert(g.songSetName);
  g.iSongInSet = iSongInSet;
  if (iSongInSet < 0 || iSongInSet >= getCountOfSongsInSongSet(g.songSetName)) {
    enableNavButtons();
    return true; // off the edge
  }
  setNavSong(songLibrary.oSongSets[g.songSetName][iSongInSet]);

  // returns fIsLastSongInSet
  return g.iSongInSet == getCountOfSongsInSongSet(g.songSetName) - 1;
}

function setNavSong(songName) {
  g.songName = songName;
  g.songData = songLibrary.oSongs[songName];
  console.assert(g.songData);
  g.cPages = calcSongPageCount(g.songData);
  g.iPage = 0;
  g.iRepeat = 0;  
  ge('selNavSongs').value = songName;
  setNavSongPage(0);
  blankScreen();
}

function calcSongPageCount(songData) {
  let cPages = songData.aPageOrder.length * songData.RepeatCount;
  if (songData.TagPage) {
    cPages++;
  }
  return cPages;
}

function setNavSongPage(iPage) {
  if (iPage < 0 || iPage >= g.cPages) {
    return true;  // off the end
  }
  g.pageName = 
    g.songData.aPageOrder[iPage % g.songData.aPageOrder.length];
  if (g.songData.TagPage && iPage == g.cPages - 1) {
    g.pageName = g.songData.TagPage;
  }
  g.aPageLines = g.songData.oPages[g.pageName];
  g.iPage = iPage;
  return iPage == g.cPages - 1;  // returns fIsLastPageInSong
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
  enableElement('btnPrevSong', g.iSongInSet > 0);
  enableElement('btnNextSong', g.iSongInSet < getCountOfSongsInSongSet(g.songSetName) - 1);
  enableElement('btnNavPrevPage', g.iPage > 0);
  enableElement('btnNextPage', g.iPage < g.cPages - 1);
}

// show navigation event handlers


function prevPage(event) {
  if (g.iPage > 0) {
    setNavSongPage(g.iPage - 1);
    renderNavState();
    enableNavButtons();
    renderNavPage();    
  }
}

function blankScreen(event) {
  localStorage.setItem('projector-message', JSON.stringify({
    content: ''
  }));
  localStorage.clear('projector-message');
  g.isScreenBlank = true;
  renderNavState();
  renderNavPagePreview();
}

function nextPage(event) {
  if (g.iPage < g.cPages - 1) {
    if (!g.isScreenBlank) {
      setNavSongPage(g.iPage + 1);
    }
    renderNavState();
    enableNavButtons();
    renderNavPage();
  }
}

function prevSong(event) {
  if (g.iSongInSet > 0) {
    setNavSongInSet(g.iSongInSet - 1);
    renderNavState();
    enableNavButtons();
    blankScreen();  
  }
}

function renderNavPage(event) {
  console.assert(g.songData);
  const oMessage = {
    fontSize: g.songData.fontSize,
    fontBoldness: g.songData.fontBoldness,
    lineHeight: g.songData.lineHeight,
    content: g.aPageLines,
    allCaps: songLibrary.defaults.allCaps,
    spaceAbove: g.songData.oPageData[g.pageName].spaceAbove, // em
    license: g.songData.License,
    pageNumber: g.iPage + 1,
    lastPage: g.iPage == g.cPages - 1 ? true : false,
    songNumber: g.iSongInSet + 1,
    lastSong: getCountOfSongsInSongSet(g.songSetName) - 1 == g.iSongInSet
  };

  localStorage.setItem('projector-message', JSON.stringify(oMessage));
  localStorage.clear('projector-message');
  g.isScreenBlank = false;
  renderNavState();
  renderNavPagePreview();
}

function nextSong(event) {
  if (g.iSongInSet < getCountOfSongsInSongSet(g.songSetName) - 1) {
    setNavSongInSet(g.iSongInSet + 1);
  }
  renderNavState();
  enableNavButtons();
  blankScreen();  
}

function renderNavPagePreview() {
  console.assert(g.songData);
  console.assert(g.aPageLines);
  console.assert(undefined != g.iPage);
  console.assert(g.cPages);
  console.assert(g.songName);
  let html = `<table style="border: white solid 1px; background-color: black;" height="300"; width="${
      fixit(300 / g.aspectRatio, 0)
    }"><tr><td>`;
  //`<span class="smaller">Page ${
  //     g.iPage + 1
  //   } of ${
  //     g.cPages
  //   } of "${
  //     g.songName 
  //   }"</span><br><br>`;
  if (g.isScreenBlank) {
     html += `Projector is Blank<br><br><span class="smaller">
     Ready to show page&nbsp;${
      g.iPage + 1
    }&nbsp;of&nbsp;${
      g.cPages
    }</span>`;
  } else {
    html += g.aPageLines.join('<br>');
  }
  ge('tdPagePreview').innerHTML = html + '</td></tr></table>';
}

function onPagePreviewHasFocus(event) {
  event.target.style = "border: solid yellow 5px;";
}

function onPagePreviewLostFosus(event) {
  event.target.style = "";
}

// Projector formatting

// General formatting
function onAllCapsChanged(event) {
  songLibrary.defaults.allCaps = event.srcElement.checked ? 1 : 0;
  renderNavPage();
}

// Song formatting
function biggerFont(event) {
  g.songData.fontSize = fixit(g.songData.fontSize * 1.1, 3)
  renderNavPage();
}

function smallerFont(event) {
  g.songData.fontSize = fixit(g.songData.fontSize * .9, 3);
  renderNavPage();
}

function biggerLineHeight(event) {
  g.songData.lineHeight = fixit(g.songData.lineHeight * 1.05, 3)
  renderNavPage();
}

function smallerLineHeight(event) {
  g.songData.lineHeight = fixit(g.songData.lineHeight * .95, 3)
  renderNavPage();
}

function bolderFont(event) {
  if (g.songData.fontBoldness < 9) {
    g.songData.fontBoldness++;
    renderNavPage();
  }
}

function lessBoldFont(event) {
  if (g.songData.fontBoldness > 1) {
    g.songData.fontBoldness--;
    renderNavPage();
  }
}

// Song Page formatting
function moveTextDown(event) {
  g.songData.oPageData[g.pageName].spaceAbove =
    Number(g.songData.oPageData[g.pageName].spaceAbove) + .25; // em
  renderNavPage();
}

function moveTextUp(event) {
  g.songData.oPageData[g.pageName].spaceAbove = 
    Number(g.songData.oPageData[g.pageName].spaceAbove) - .25; // em
  renderNavPage();
}

// song set editing


// --- Song Editing Functions ---

function setNewSongError(err) {
  ge('divNewEditSongNameError').innerText = err;
}

function initSongSetEditUI() {
  renderAllSongs(
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
  sses.songNameToAdd = ge('selFilteredSongsToAdd').value;
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
  enableElement('btnEditSongSet', !!sses.songSetNameToEdit);
  enableElement('btnDeleteSongSet', !!sses.songSetNameToEdit);
  enableElement('btnCreateNewSongSet', !!sses.newSongSetName);
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

async function deleteSongSet(event) {
  const songSetToDelete = ge('selAllSongSetsToEdit').value;
  if (getAllSongSetNames().includes(songSetToDelete)) {
    delete songLibrary.oSongSets[songSetToDelete];
    getSongSetEditState();
    renderAllSongSets(
      'selAllSongSetsToEdit', 
      'txtSongSetEditFilter',
      '',
      'spnNoSongSetsToEdit');
  }
}

async function createNewSongSet(event) {
  const sses = getSongSetEditState();
  songLibrary.oSongSets[sses.newSongSetName] = [];
  renderAllSongSets(
    'selAllSongSetsToEdit', 
    'txtSongSetEditFilter', 
    sses.newSongSetName,
    'spnNoSongSetsToEdit');
  renderAllSongSets(
    'selNavSongSets', 
    'txtNavSongSetFilter', 
    ge('selNavSongSets').value,
    'spnNoSongSetsToEdit');
  editSelectedSongSet();
}

async function renameSongSet(event) {
  const sses = getSongSetEditState();
  console.assert(sses.newSongSetName, 'UI should not allow this');
  if (sses.newSongSetName == sses.songSetNameToEdit) {
    setSongSetError('No action taken. New song name matches selected one.');
    return;
  }
  songLibrary.oSongSets[sses.newSongSetName] = songLibrary.oSongSets[sses.songSetNameToEdit];
  delete songLibrary.oSongSets[sses.songSetNameToEdit];
  renderAllSongSets(
    'selAllSongSetsToEdit', 
    'txtSongSetEditFilter', 
    sses.newSongSetName,
    'spnNoSongSetsToEdit');
  ge('txtNewSongSetName').value = '';

  let selectedNavSongSetName = ge('selNavSongSets').value;
  if (selectedNavSongSetName == sses.songSetNameToEdit) {
    selectedNavSongSetName = sses.newSongSetName;
  }
  renderAllSongSets(
    'selNavSongSets', 
    'txtNavSongSetFilter', 
    selectedNavSongSetName,
    'spnNoSongSets');

  editSelectedSongSet();
}

async function onSongSetEditFilterChanged(event) {
  renderAllSongSets(
    'selAllSongSetsToEdit',
    'txtSongSetEditFilter',
    '',
    'spnNoSongSetsToEdit');
}

async function onEditSongInSetFilterChanged(event) {
  renderAllSongs(
    'selFilteredSongsToAdd', 
    'txtSongSetAddSongFilter',
    '',
    'spnNoSongsToAddToSongSet');
  fillSongToEdit();
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
      sses.aSongList[0]);
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
  ge('chkEditExistingSong').checked = true;
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
    ses.aPageNames[0]);
  onSelectedVerseToEditChanged(null, ses);
  onVerseOrderChanged();

  // other settings
  ge('txtNotes').value = 
    ses.songData.Notes ? ses.songData.Notes : '';
  ge('txtAuthor').value = 
    ses.songData.Author ? ses.songData.Author : '';
  ge('txtPublisher').value = 
    ses.songData.Publisher ? ses.songData.Publisher : '';
  ge('txtLicense').value = 
    ses.songData.License ? ses.songData.License : '';
  ge('txtDefaultLicense').value = 
    songLibrary.defaults.License ? songLibrary.defaults.License : '';
  ge('selRepeatCount').value = 
    ses.songData.RepeatCount ? ses.songData.RepeatCount : 1;

  enableSongEditButtons();
}

function onRepeatCountChanged(event) {
  const ses = getSongEditState();
  ses.songData.RepeatCount = ge('selRepeatCount').value;
  renderOverallOrderText();
}

function onNotesChanged(event) {
  const ses = getSongEditState();
  ses.songData.Notes = ge('txtNotes').value.trim();
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
  ge('chkEditNewSong').checked = true;
  clearSongUI();
  enableSongEditButtons();
}

async function onNewSongFilterChanged(event) {
  renderAllSongs(
    'selAllSongsToEdit', 
    'txtEditSongFilter', 
    '', 
    'spnNoSongsToEdit');
}

function getSongEditState() {
  const ses = {};
  ses.fExistingSong = ge('chkEditExistingSong').checked ? 1 : 0;
  ses.selectedSongToEdit = ge('selAllSongsToEdit').value;
  ses.newSongEditName = ge('txtNewSongName').value.trim();
  if (ses.selectedSongToEdit) {
    console.assert(songLibrary.oSongs[ses.selectedSongToEdit]);
    ses.songData = songLibrary.oSongs[ses.selectedSongToEdit];
    ses.aPageOrder = ses.songData.aPageOrder;
    ses.oPages = ses.songData.oPages;
    ses.aPageNames = Object.keys(ses.oPages);
    ses.selectedOrderVerseIdx = Number(ge('selSongVerseOrder').value);
    ses.selectedOrderVerseName = ses.aPageOrder[ses.selectedOrderVerseIdx];
  }
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

  // disable editing fieldsets if the song edit mode is active
  enableElement('fsEditSongVerses', ses.fExistingSong);
  enableElement('fsEditSongVerseOrder', ses.fExistingSong);
  enableElement('fsOtherSongSettings', ses.fExistingSong);

  // New song edit buttons
  const fSongNameAlreadyExists = 
    doesProposedEditSongNameExist(ses.newSongEditName);
  if (fSongNameAlreadyExists) {
    // tell user this song name already exists
    // which means we can't rename it or create a new song.
    show('spnNoSongsToEdit');
    ge('spnNoSongsToEdit').innerText = 
      `The song "${ses.newSongEditName}" already exists.`;
  }

  enableElement('btnCreateNewSong', 
    !ses.fExistingSong && 
    ses.newSongEditName &&
    !fSongNameAlreadyExists &&
    ses.newSongEditName != ses.selectedSongToEdit
  );

  enableElement('btnRenameSong',
    !ses.fExistingSong && 
    ses.newSongEditName &&
    fSongNameAlreadyExists &&
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
  ge('chkEditExistingSong').checked = true;
  ge('txtEditSongFilter').value = '';
  ge('txtNewSongName').value = '';
  await onNewSongFilterChanged();
  ge('selAllSongsToEdit').value = ses.newSongEditName;
  await delay(1);
  fillSongToEdit();
}

function clearSongUI(event) {
  ge('selSongVersesToEdit').innerHTML = '';
  ge('txtaVerseLines').value = '';
  ge('selRepeatCount').value = 1;
  ge('selSongVerseOrder').innerHTML = '';
    // other settings
  ge('txtNotes').value = '';
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
    ge('chkEditExistingSong').checked = true;
    renderAllSongs(
      'selAllSongsToEdit', 
      'txtEditSongFilter', 
      newSongName,
      'spnNoSongsToEdit');

    // fix any song sets that reference the renamed song
    Object.entries(songLibrary.oSongSets).forEach(
      function(aKVSongSet) {
        aKVSongSet[1].forEach(
          function(songName, iSongInSet) {
            if (songName == oldSongName) {
              aKVSongSet[1][iSongInSet] = newSongName;
            }
          }
        )
      }
    )

    await reRenderAllSongSelectControls(oldSongName, newSongName);
    fillSongToEdit();
  }
}

async function reRenderAllSongSelectControls(oldSongName, newSongName) {
  let selectedNavSong = ge('selNavSongs').value;
  if (selectedNavSong == oldSongName) {
    selectedNavSong = newSongName;
  }
  renderAllSongs(
    'selNavSongs', 
    'txtNavSongFilter', 
    selectedNavSong,
    'spnNoSongsDefined');

  let selectedAllCurrentSongs = ge('selFilteredSongsToAdd').value;
  if (selectedAllCurrentSongs == oldSongName) {
    selectedAllCurrentSongs = newSongName;
  }
  renderAllSongs(
    'selFilteredSongsToAdd', 
    'txtSongSetAddSongFilter', 
    selectedAllCurrentSongs,
    'spnNoSongsToAddToSongSet');

  let selectedAllSongsToEdit = ge('selAllSongsToEdit').value;
  if (selectedAllSongsToEdit == oldSongName) {
    selectedAllSongsToEdit = newSongName;
  }
  renderAllSongs(
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

  await reRenderAllSongSelectControls();
  await initSongEditUI();
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
  ge('txtaVerseLines').value = 
  ses.songData.oPages[ses.pageName] ?
    ses.songData.oPages[ses.pageName].join('\n') :
    '';
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
    // TODO: disable this button in this case
    ge('divVerseNameEditError').innerText = 
      'You must first enter a verse name to add one.';
    return;
  }
  if (ses.aPageNames.includes(ses.newVerseName)) {
    ge('divVerseNameEditError').innerText = 
      `There already is a verse named "${ses.newVerseName}".`;
    return;    
  }
  ses.songData.oPages[ses.newVerseName] = 
    ge('txtaVerseLines').value.trim().split('\n');

  // BUG: Not sure why but sometimes we have an extra null verse
  delete ses.songData.oPages[''];

  fillSongToEdit();
  ge('selSongVersesToEdit').value = ses.newVerseName;
  onSelectedVerseToEditChanged(null, ses);
  enableSongEditVerseButtons();
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

async function moveSelectedVerseUpInOrder(event) {
  const ses = getSongEditState();
  console.assert(ses.selectedOrderVerseIdx > 0);
  const T = ses.songData.aPageOrder[ses.selectedOrderVerseIdx];
  ses.songData.aPageOrder[ses.selectedOrderVerseIdx] =
    ses.songData.aPageOrder[ses.selectedOrderVerseIdx - 1];
  ses.songData.aPageOrder[ses.selectedOrderVerseIdx - 1] = T;
  ge('selSongVerseOrder').value = ses.selectedOrderVerseIdx - 1;
  fillSongToEdit();
}

async function moveSelectedVerseDownInOrder(event) {
  const ses = getSongEditState();
  console.assert(ses.selectedOrderVerseIdx < ses.songData.aPageOrder.length - 1);
  const T = ses.songData.aPageOrder[ses.selectedOrderVerseIdx];
  ses.songData.aPageOrder[ses.selectedOrderVerseIdx] =
    ses.songData.aPageOrder[ses.selectedOrderVerseIdx + 1];
  ses.songData.aPageOrder[ses.selectedOrderVerseIdx + 1] = T;
  ge('selSongVerseOrder').value = ses.selectedOrderVerseIdx + 1;
  fillSongToEdit();
}

async function addVerseToVerseOrder(event) {
  const ses = getSongEditState();
  ses.songData.aPageOrder.push(ses.pageName);
  fillSongToEdit();  
}

async function deleteVerseOrderVerse(event) {
  const ses = getSongEditState();
  ses.songData.aPageOrder.splice(ses.selectedOrderVerseIdx, 1);
  fillSongToEdit();    
}

// data search

function onSearchAll(event) {
  ge('chkSearchInSongSetNames').checked = 'checked';
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
  let results = '';
  if (searchTerms.length < 3 && searchTerms != '*') {
    // don't respond to empty or tiny search terms cuz almost
    // everything will hit.
    results = "You must enter at least 3 characters to search for or * to find all items."
  } else {
    const aSearchTokens = searchTerms.split(/\s+/);
    let resultPart = '';
    if (ge('chkSearchInSongSetNames').checked) {
      resultPart = 'In Song Set Names:\n';
      fResultFound = false;
      Object.keys(songLibrary.oSongSets).forEach(
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
    if (ge('chkSearchInSongNames').checked) {
      resultPart = 'In Song Names:\n';
      fResultFound = false;
      Object.keys(songLibrary.oSongs).forEach(
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
      Object.entries(songLibrary.oSongs).forEach(
        function(oSongKV) {
          Object.entries(oSongKV[1].oPages).forEach(
            function(aPageKV) {
              aPageKV[1].forEach(
                function(lyricLine) {
                  if (areAllTokensInText(aSearchTokens, lyricLine)) {
                    resultPart += `  Song:"${oSongKV[0]}"\n    Verse: "${aPageKV[0]}"\n      Lyric Line: ${lyricLine}\n`;
                    fResultFound = true;
                  }
                }
              )
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
      Object.entries(songLibrary.oSongs).forEach(
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
      Object.entries(songLibrary.oSongs).forEach(
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
      Object.entries(songLibrary.oSongs).forEach(
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
      Object.entries(songLibrary.oSongs).forEach(
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
 * The event triggered when the user wants to print a song or
 * a song-set.
 * @param {object} event 
 */
function onPrintSongs(event) {
  setSongSetError('');

  let songSetName = '';
  let songName = '';
  if (ge('chkNavSongChosen').checked) {
    songSetName = ge('selNavSongSets').value;
  } else {
    songName = ge('selNavSongs').value;
  }

  printSongs(songSetName, songName);
}

/**
 * This expects either songSetName OR songName to be a string
 * while the other is ''. 
 * It prints either an entire song-set or just one song.
 * @param {string} songSetName 
 * @param {string} songName 
 */
function printSongs(songSetName, songName) {
  // save the body html to restore later
  console.assert(!!songSetName == !songName);
  const htmlBodySaved = document.body.innerHTML;

  let htmlPrint = '';
  let iPrintPage = 0;

  if (songSetName) {
    const aSongsInSet = songLibrary.oSongSets[songSetName]
    aSongsInSet.forEach(
      function(songName, iSongInSet) {
        const oHtmlPrint = { htmlPrint: htmlPrint };
        iPrintPage = prepPrint(
          songName, 
          iSongInSet, 
          iPrintPage, 
          oHtmlPrint, // so we pass by reference
          aSongsInSet.length);
        htmlPrint = oHtmlPrint.htmlPrint;
      }
    );
  } else {
    ge('divPrintSongError').innerText = '';
    const oHtmlPrint = { htmlPrint: htmlPrint };
    iPrintPage = prepPrint(
      songName, 
      -1, 
      iPrintPage,
      oHtmlPrint, 
      0);
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
  cSongsInSet) {

  setNavSong(songName);
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

  if (iSongInSet == -1) {
    htmlPageTemplate = htmlPageTemplate.
      replace(/%songName%/, songName);
  } else {
    htmlPageTemplate = htmlPageTemplate.
      replace(/%songName%/, `${songName} (${iSongInSet + 1} of ${cSongsInSet})`);
  }

  // calculate all song pages in order that will print
  const aPageNamesUnwound = getUnwoundPages(sd);

  // start with the first print page
  let printPageNumber = 1;

  let htmlPage = htmlPageTemplate;

  for (let iSongPageUnwound = 0; iSongPageUnwound < aPageNamesUnwound.length; iSongPageUnwound++) {
    const nSongThisPage = (iSongPageUnwound % 8) + 1; // 1 based index
    const pageName = aPageNamesUnwound[iSongPageUnwound];
    const pageLines = sd.oPages[pageName];
    const rxPageNameKey = new RegExp(`%pageName-${nSongThisPage}%`, 'g');
    const rxPageLinesKey = new RegExp(`%pageLines-${nSongThisPage}%`, 'g');

    // fill in each song page's data
    htmlPage = htmlPage.
      replace(rxPageNameKey, `${iSongPageUnwound + 1}) ${pageName}:`).
      replace(rxPageLinesKey, pageLines.join('\n<br>\n'));

    console.log(`Printing page "${pageName}" on print page ${printPageNumber}: nSongThisPage=${nSongThisPage}`)

    if (nSongThisPage == 8 || iSongPageUnwound == aPageNamesUnwound.length - 1) {
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

g.visibility ={};
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

function renderAllSongSets(
  idSel, 
  filterId='', 
  selectedSongSetName='',
  noSongsId) 
{
  const elSel = ge(idSel);
  let aSongSetNames = getAllSongSetNames().sort();
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

function renderAllSongs(
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
}

// general utilities

function getAllSongSetNames() {
  return Object.keys(songLibrary.oSongSets).sort();
}

function getAllSongNames() {
  return Object.keys(songLibrary.oSongs).sort();
}

function getCountOfSongsInSongSet(songSetName) {
  console.assert(Array.isArray(songLibrary.oSongSets[songSetName]));
  return songLibrary.oSongSets[songSetName].length;
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
  const promise = new Promise(
      (resolve, reject) => {
          if (isNaN(timeInMilliseconds) || Math.floor(timeInMilliseconds) != timeInMilliseconds || timeInMilliseconds < 1) {
              reject('Time must be a positive integer.')
          } else {
              setTimeout(resolve, timeInMilliseconds);
          }
      }
  );
  return promise;
}