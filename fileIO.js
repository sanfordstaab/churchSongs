// fileIO.js

var fio = {};

// module of functions to support drop and fileIO of data into and out of an html page

/**
 * Generic Event handler for ondrop
 * @param {*} event 
 * @param {*} fnImportToUI // see fio.dropFile()
 */
fio.onDropFile = (event, fnImportToUI) => {
  event.preventDefault(); // prevents drop from going to new tab in browser
  fio.dropFile(event.dataTransfer.files[0], fnImportToUI);
}

/**
 * Called like this:
 * <input type="file" onchange="fio.importFromFile(this, fnImportToUI);">
 * or attach an event listener that does the equivalent.
 * @param {HTMLElement} elFileInput
 * @param {function} fnImportToUI // see fio.dropFile
 */
fio.importFromFile = (elFileInput, fnImportToUI) => {
  const fileHandle = elFileInput.files[0];
  if (fileHandle) {
    fio.dropFile(fileHandle, fnImportToUI);
  }
}

/**
 * Worker for drag/drop operation - called by onDropFile() or directly
 * @param {*} fileHandle // FileHandle of dropped file
 * @param {*} fnImportToUI
 * Where:
 * fnImportToUI(fileName, sData)
 *   Uses sData to place the read data into the UI or DB
 *   Uses fileName to present to the user a successful load from fileName
 *   filename == '' on error.
 */
fio.dropFile = async (fileHandle, fnImportToUI) => {
  var reader = new FileReader();
  reader.onload = function(readerLoadedEvent) {
    const sData = readerLoadedEvent.target.result;
    fnImportToUI(fileHandle.name, sData);
  };
  try {
    reader.readAsText(fileHandle, "UTF-8");
  } catch (e) {
    fnImportToUI('', e.message);
  }
}

/**
 * Used to import via a simple button.
 * The caller must call window.showOpenFilePicker() and give the
 * returned fileHandle to this API.  
 * This is because calling this from an async function 
 * (like this one) breaks the "user gesture" security context.
 * @param {*} fileHandle 
 * @param {*} fnImportToUI 
 */
fio.importFromFileButton = async function(fileHandle, fnImportToUI) {
  if (Array.isArray(fileHandle)) {
    fileHandle = fileHandle[0];
  }
  var blob;
  const reader = new FileReader();
  reader.addEventListener('loadend', (event) => {
    // oops we need the blob BEFORE we call reader.read...()!!!
    blob = new Blob([new Uint8Array(event.target.result)], {type: fileHandle.type })
    fnImportToUI(fileHandle, event.target.result)
  });
  // oops we can't get the blob from the fileHandle till we have the data!!!
  // Can't call with fileHandle (cuz it's not a blob!).
  reader.readAsArrayBuffer(blob);
}

/**
 * callable from a button click
 * @param {fileHandle} fileHandle // as returned from showSaveFilePicker()
 * @param {string} sData 
 * @param {function} fnExportToUI 
 * fnExportToUI(fileName, sData_or_sError)
 * fileName == '' on error
 */
fio.exportToFile = async (fileHandle, sData, fnExportToUI) => {
  try {
    await writeFile(fileHandle, sData);
    fnExportToUI(fileHandle.name, sData);
  } catch(e) {
    fnExportToUI('', e.message);
  }

  async function writeFile(fileHandle, contents) {
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
  }   
}