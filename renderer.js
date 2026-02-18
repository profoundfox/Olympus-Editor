const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const eraserBtn = document.getElementById("eraserBtn");
const printBtn = document.getElementById("print");

let columns = document.getElementById("columns");
let rows = document.getElementById("rows");

columns.addEventListener("input", updateGridSize);
rows.addEventListener("input", updateGridSize);

let eraseMode = false;
let isMouseDown = false;
let brushSize = 1;

let rectStart = null;
let isRectMode = false;

const TILE_SIZE = 16;

let MAP_COLS = parseInt(columns.value, 10);
let MAP_ROWS = parseInt(rows.value, 10);

const tilesetCanvas = document.getElementById("tileset");
const mapCanvas = document.getElementById("map");
const gridCanvas = document.getElementById("grid");

const tCtx = tilesetCanvas.getContext("2d");
const mCtx = mapCanvas.getContext("2d");
const gCtx = gridCanvas.getContext("2d");

const tilemap = new Image();
tilemap.src = "tilemap.png";

let ATLAS_COLS = 0;
let ATLAS_ROWS = 0;

let selectedTile = 1;

let mapData = Array.from({ length: MAP_ROWS }, () =>
  Array.from({ length: MAP_COLS }, () => 0)
);

tilemap.onload = () => {
  ATLAS_COLS = Math.floor(tilemap.width / TILE_SIZE);
  ATLAS_ROWS = Math.floor(tilemap.height / TILE_SIZE);

  tilesetCanvas.width = tilemap.width;
  tilesetCanvas.height = tilemap.height;

  mapCanvas.width = MAP_COLS * TILE_SIZE;
  mapCanvas.height = MAP_ROWS * TILE_SIZE;

  gridCanvas.width = MAP_COLS * TILE_SIZE;
  gridCanvas.height = MAP_ROWS * TILE_SIZE;

  tCtx.drawImage(tilemap, 0, 0);
  drawGrid();
};

function setTile(col, row, tileID, shouldErase = false) {
  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return;
  mapData[row][col] = shouldErase ? 0 : tileID;
}

function fillArea(startCol, startRow, endCol, endRow, tileID, shouldErase = false) {
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      setTile(col, row, tileID, shouldErase);
    }
  }
}

tilesetCanvas.addEventListener("click", (e) => {
  const rect = tilesetCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);

  if (x < 0 || x >= ATLAS_COLS || y < 0 || y >= ATLAS_ROWS) return;

  selectedTile = y * ATLAS_COLS + x + 1;

  console.log(x, y);
  drawTilesetHighlight(x, y);
});

function drawTilesetHighlight(x, y) {
  tCtx.clearRect(0, 0, tilesetCanvas.width, tilesetCanvas.height);
  tCtx.drawImage(tilemap, 0, 0);

  tCtx.strokeStyle = "red";
  tCtx.lineWidth = 2;
  tCtx.strokeRect(
    x * TILE_SIZE,
    y * TILE_SIZE,
    TILE_SIZE,
    TILE_SIZE
  );
}

mapCanvas.addEventListener("contextmenu", e => e.preventDefault());

mapCanvas.addEventListener("mousedown", e => {
  const { col, row } = getMouseTile(e);
  if (col === null) return;

  if (e.shiftKey) {
    isRectMode = true;
    rectStart = { col, row };
  } else {
    isMouseDown = true;
    paintBrush(col, row, e.button === 2);
  }
});

mapCanvas.addEventListener("mousemove", e => {
  const { col, row } = getMouseTile(e);
  if (col === null) return;

  if (isRectMode && rectStart) {
    drawMap();
    drawRectPreview(rectStart.col, rectStart.row, col, row);
  } else if (isMouseDown) {
    paintBrush(col, row, e.buttons === 2);
  }
});

window.addEventListener("mouseup", e => {
  if (isRectMode && rectStart) {
    const { col, row } = getMouseTile(e);
    if (col !== null) {
      const shouldErase = eraseMode || e.button === 2;
      fillArea(rectStart.col, rectStart.row, col, row, selectedTile, shouldErase);
      drawMap();
    }
  }
  isMouseDown = false;
  isRectMode = false;
  rectStart = null;
});

function paintBrush(col, row, isRightClick) {
  const shouldErase = eraseMode || isRightClick;

  for (let y = 0; y < brushSize; y++) {
    for (let x = 0; x < brushSize; x++) {
      setTile(col + x, row + y, selectedTile, shouldErase);
    }
  }

  drawMap();
}

function getMouseTile(e) {
  const rect = mapCanvas.getBoundingClientRect();
  const col = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const row = Math.floor((e.clientY - rect.top) / TILE_SIZE);

  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return { col: null, row: null };
  return { col, row };
}

function drawRectPreview(startCol, startRow, endCol, endRow) {
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  gCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  drawGrid();

  gCtx.strokeStyle = "red";
  gCtx.lineWidth = 2;
  gCtx.strokeRect(
    minCol * TILE_SIZE,
    minRow * TILE_SIZE,
    (maxCol - minCol + 1) * TILE_SIZE,
    (maxRow - minRow + 1) * TILE_SIZE
  );
}

function drawMap() {
  mCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const tileID = mapData[row][col];
      if (tileID === 0) continue;
      const index = tileID - 1;
      const sx = (index % ATLAS_COLS) * TILE_SIZE;
      const sy = Math.floor(index / ATLAS_COLS) * TILE_SIZE;
      mCtx.drawImage(tilemap, sx, sy, TILE_SIZE, TILE_SIZE, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  gCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  drawGrid();
}

function drawGrid() {
  gCtx.strokeStyle = "rgba(0,0,0,0.2)";
  gCtx.lineWidth = 1;
  for (let x = 0; x <= MAP_COLS; x++) {
    gCtx.beginPath();
    gCtx.moveTo(x * TILE_SIZE, 0);
    gCtx.lineTo(x * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    gCtx.stroke();
  }
  for (let y = 0; y <= MAP_ROWS; y++) {
    gCtx.beginPath();
    gCtx.moveTo(0, y * TILE_SIZE);
    gCtx.lineTo(MAP_COLS * TILE_SIZE, y * TILE_SIZE);
    gCtx.stroke();
  }
}

function updateGridSize() {
  MAP_COLS = parseInt(columns.value, 10);
  MAP_ROWS = parseInt(rows.value, 10);

  mapCanvas.width = MAP_COLS * TILE_SIZE;
  mapCanvas.height = MAP_ROWS * TILE_SIZE;

  gridCanvas.width = MAP_COLS * TILE_SIZE;
  gridCanvas.height = MAP_ROWS * TILE_SIZE;

  mapData = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 0)
  );

  drawMap();
}


const { ipcRenderer } = require('electron');

function exportMap() {
  const csvRows = mapData.map(row => row.join(","));
  const csvString = csvRows.join("\n");

  ipcRenderer.invoke('save-csv', csvString).then(result => {
    if (result.success) {
      console.log('Map saved to', result.filePath);
    } else {
      console.log('Save canceled or failed');
    }
  });
}

exportBtn.addEventListener("click", exportMap);

exportBtn.addEventListener("click", exportMap);

clearBtn.addEventListener("click", () => {
  mapData = Array.from({ length: MAP_ROWS }, () => Array.from({ length: MAP_COLS }, () => 0));
  drawMap();
});

eraserBtn.addEventListener("click", () => {
  eraseMode = !eraseMode;
  eraserBtn.textContent = eraseMode ? "Eraser (ON)" : "Eraser";
});

printBtn.addEventListener("click", () => {
  const currentColumns = parseInt(columns.value, 10);
  const currentRows = parseInt(rows.value, 10);

  console.log("Columns:", currentColumns);
  console.log("Rows:", currentRows);
});
 