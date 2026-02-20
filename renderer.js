const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const eraserBtn = document.getElementById("eraserBtn");
const fillBtn = document.getElementById("fillBtn");
const printBtn = document.getElementById("print");

let columns = document.getElementById("columns");
let rows = document.getElementById("rows");

columns.addEventListener("input", updateGridSize);
rows.addEventListener("input", updateGridSize);

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
let brushSize = 1;

let mapHistory = [];
const MAX_HISTORY = 20;

let prevMapData = Array;

let mapData = Array.from({ length: MAP_ROWS }, () =>
  Array.from({ length: MAP_COLS }, () => 0)
);

const Tools = {
  BRUSH: "brush",
  RECT: "rectangle",
  ERASER: "eraser",
  FILL: "fill"
};

let currentTool = Tools.BRUSH;

let toolState = {
  isDrawing: false,
  start: null
};

function setTool(tool) {
  currentTool = tool;
}

tilemap.onload = () => {
  ATLAS_COLS = Math.floor(tilemap.width / TILE_SIZE);
  ATLAS_ROWS = Math.floor(tilemap.height / TILE_SIZE);

  tilesetCanvas.width = tilemap.width;
  tilesetCanvas.height = tilemap.height;

  resizeCanvases();
  tCtx.drawImage(tilemap, 0, 0);
  drawGrid();
};


const toolHandlers = {
  brush: {
    onMouseDown(col, row, e) {
      if (e.shiftKey) {
        toolState.start = { col, row };
      } else {
        paintBrush(col, row, false);
      }
    },
    onMouseMove(col, row, e) {
      if (toolState.start) {
        drawMap();
        drawRectPreview(toolState.start.col, toolState.start.row, col, row);
      } else {
        paintBrush(col, row, false);
      }
    },
    onMouseUp(col, row, e) {
      if (toolState.start) {
        fillArea(toolState.start.col, toolState.start.row, col, row, selectedTile, false);
        toolState.start = null;
        drawMap();
      }
    }
  },

  eraser: {
    onMouseDown(col, row) {
      paintBrush(col, row, true);
    },
    onMouseMove(col, row) {
      paintBrush(col, row, true);
    }
  },

  fill: {
    onMouseDown(col, row) {
      bucketFill(col, row, selectedTile);
    },
    onMouseMove(col, row) {
    }
  },

  rectangle: {
    onMouseDown(col, row) {
      toolState.start = { col, row };
    },
    onMouseMove(col, row) {
      if (!toolState.start) return;
      drawMap();
      drawRectPreview(toolState.start.col, toolState.start.row, col, row);
    },
    onMouseUp(col, row) {
      if (!toolState.start) return;
      fillArea(toolState.start.col, toolState.start.row, col, row, selectedTile, false);
      toolState.start = null;
      drawMap();
    }
  }
};

function saveHistory() {
  const snapshot = mapData.map(row => [...row]);
  mapHistory.push(snapshot);
  if (mapHistory.length > MAX_HISTORY) mapHistory.shift();
}

function undo() {
  if (mapHistory.length === 0) return;
  mapData = mapHistory.pop();
  drawMap();
}

window.addEventListener("keydown", e => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  if ((isMac && e.metaKey && e.key === 'z') || (!isMac && e.ctrlKey && e.key === 'z')) {
    e.preventDefault();
    undo();
  }
});

mapCanvas.addEventListener("mousedown", e => {
  const { col, row } = getMouseTile(e);
  if (col === null) return;

  toolState.isDrawing = true;
  toolHandlers[currentTool]?.onMouseDown?.(col, row, e);
});

mapCanvas.addEventListener("mousemove", e => {
  if (!toolState.isDrawing) return;

  const { col, row } = getMouseTile(e);
  if (col === null) return;

  toolHandlers[currentTool]?.onMouseMove?.(col, row, e);
});

window.addEventListener("mouseup", e => {
  if (!toolState.isDrawing) return;

  const { col, row } = getMouseTile(e);
  if (col !== null) {
    toolHandlers[currentTool]?.onMouseUp?.(col, row, e);
  }

  toolState.isDrawing = false;
  toolState.start = null;
  toolState.historySaved = false;
});

mapCanvas.addEventListener("contextmenu", e => e.preventDefault());

function setTile(col, row, tileID, shouldErase = false) {
  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return;

  if (!toolState.historySaved) {
    saveHistory();
    toolState.historySaved = true;
  }

  mapData[row][col] = shouldErase ? 0 : tileID;
}

function fillArea(startCol, startRow, endCol, endRow, tileID, shouldErase = false) {
  if (!toolState.historySaved) {
    saveHistory();
    toolState.historySaved = true;
  }
  
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

function bucketFill(startCol, startRow, tileID) {
  const targetTile = mapData[startRow][startCol];
  if (targetTile === tileID) return;

  const stack = [{ col: startCol, row: startRow }];

  while (stack.length > 0) {
    const { col, row } = stack.pop();

    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) continue;

    if (mapData[row][col] !== targetTile) continue;

    setTile(col, row, tileID, false);

    stack.push({ col: col + 1, row: row });
    stack.push({ col: col - 1, row: row });
    stack.push({ col: col, row: row + 1 });
    stack.push({ col: col, row: row - 1 });
  }

  drawMap();
}



function paintBrush(col, row, shouldErase) {
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

  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS)
    return { col: null, row: null };

  return { col, row };
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

      mCtx.drawImage(
        tilemap,
        sx,
        sy,
        TILE_SIZE,
        TILE_SIZE,
        col * TILE_SIZE,
        row * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
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

tilesetCanvas.addEventListener("click", e => {
  const rect = tilesetCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);

  if (x < 0 || x >= ATLAS_COLS || y < 0 || y >= ATLAS_ROWS) return;

  selectedTile = y * ATLAS_COLS + x + 1;
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

function resizeCanvases() {
  mapCanvas.width = MAP_COLS * TILE_SIZE;
  mapCanvas.height = MAP_ROWS * TILE_SIZE;
  gridCanvas.width = MAP_COLS * TILE_SIZE;
  gridCanvas.height = MAP_ROWS * TILE_SIZE;
}

function updateGridSize() {
  const newCols = parseInt(columns.value, 10);
  const newRows = parseInt(rows.value, 10);

  const newMapData = Array.from({ length: newRows }, (_, row) =>
    Array.from({ length: newCols }, (_, col) =>
      row < MAP_ROWS && col < MAP_COLS ? mapData[row][col] : 0
    )
  );

  MAP_COLS = newCols;
  MAP_ROWS = newRows;
  mapData = newMapData;

  resizeCanvases();
  drawMap();
}

const { ipcRenderer } = require("electron");

function exportMap() {
  const csvRows = mapData.map(row => row.join(","));
  const csvString = csvRows.join("\n");

  ipcRenderer.invoke("save-csv", csvString).then(result => {
    if (result.success) {
      console.log("Map saved to", result.filePath);
    }
  });
}

exportBtn.addEventListener("click", exportMap);

clearBtn.addEventListener("click", () => {
  mapData = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 0)
  );
  drawMap();
});

eraserBtn.addEventListener("click", () => {
  setTool(
    currentTool === Tools.ERASER ? Tools.BRUSH : Tools.ERASER
  );

  eraserBtn.textContent =
    currentTool === Tools.ERASER ? "Eraser (ON)" : "Eraser";
});

fillBtn.addEventListener("click", () => {
  setTool(
    currentTool === Tools.FILL ? Tools.BRUSH : Tools.FILL
  );

  fillBtn.textContent =
    currentTool === Tools.FILL ? "Fill (ON)" : "Fill";
});

printBtn.addEventListener("click", () => {
  console.log("Columns:", MAP_COLS);
  console.log("Rows:", MAP_ROWS);
});
