/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, Menu, Tray, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const WINDOW_WIDTH = 1200;
const WINDOW_HEIGHT = 800;
const DEV_SERVER_URL = process.env.ELECTRON_START_URL || "http://localhost:3000";

let mainWindow = null;
let tray = null;
let isQuitting = false;
let staticServer = null;
let staticServerPort = null;

function getIconPath() {
  const candidates = [
    path.join(__dirname, "public", "orbit-icon-192.png"),
    path.join(__dirname, "public", "apple-touch-icon.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function mimeTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "application/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

function resolveStaticFile(outDir, requestPath) {
  const sanitizedPath = path
    .normalize(decodeURIComponent(requestPath))
    .replace(/^(\.\.(\/|\\|$))+/, "");

  const candidates = [];
  if (sanitizedPath === "/" || sanitizedPath === "." || sanitizedPath === "") {
    candidates.push(path.join(outDir, "index.html"));
  } else {
    candidates.push(path.join(outDir, sanitizedPath));
    candidates.push(path.join(outDir, `${sanitizedPath}.html`));
    candidates.push(path.join(outDir, sanitizedPath, "index.html"));
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith(outDir)) {
      continue;
    }
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return path.join(outDir, "index.html");
}

async function startStaticServer() {
  if (staticServer && staticServerPort) {
    return staticServerPort;
  }

  const outDir = path.join(__dirname, "out");
  if (!fs.existsSync(outDir)) {
    throw new Error(
      "Desktop static export not found. Run `npm run desktop-export` first.",
    );
  }

  await new Promise((resolve, reject) => {
    staticServer = http
      .createServer((request, response) => {
        const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
        const filePath = resolveStaticFile(outDir, requestUrl.pathname);
        fs.readFile(filePath, (error, data) => {
          if (error) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Orbit desktop bundle not found.");
            return;
          }
          response.writeHead(200, { "Content-Type": mimeTypeFor(filePath) });
          response.end(data);
        });
      })
      .on("error", (error) => reject(error));

    staticServer.listen(0, "127.0.0.1", () => {
      const address = staticServer.address();
      if (address && typeof address === "object") {
        staticServerPort = address.port;
        resolve();
      } else {
        reject(new Error("Unable to start Orbit static server."));
      }
    });
  });

  return staticServerPort;
}

async function loadMainRenderer() {
  if (!mainWindow) {
    return;
  }

  if (!app.isPackaged) {
    try {
      await mainWindow.loadURL(DEV_SERVER_URL);
    } catch {
      setTimeout(() => {
        void loadMainRenderer();
      }, 1000);
    }
    return;
  }

  const port = await startStaticServer();
  await mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

function createMainWindow() {
  if (mainWindow) {
    return;
  }

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 960,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#020617",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }
    event.preventDefault();
    mainWindow?.hide();
  });

  void loadMainRenderer();
}

function showMainWindow() {
  if (!mainWindow) {
    createMainWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function createSystemTray() {
  if (tray) {
    return;
  }

  const iconPath = getIconPath();
  if (!iconPath) {
    return;
  }

  tray = new Tray(iconPath);
  tray.setToolTip("Orbit");
  tray.on("double-click", showMainWindow);
  tray.on("click", showMainWindow);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Orbit",
      click: () => showMainWindow(),
    },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  showMainWindow();
});

app.whenReady().then(() => {
  createMainWindow();
  createSystemTray();

  app.on("activate", () => {
    showMainWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  if (staticServer) {
    staticServer.close();
    staticServer = null;
    staticServerPort = null;
  }
});

app.on("window-all-closed", () => {
  if (!tray && process.platform !== "darwin") {
    app.quit();
  }
});
