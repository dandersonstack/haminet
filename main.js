const { app, BrowserWindow, Tray, Menu, session } = require("electron");
const path = require("path");
const redis = require("redis");
const { ElectronBlocker } = require("@cliqz/adblocker-electron");
const { fetch } = require("cross-fetch");

const assetsDirectory = path.join(__dirname, "assets");

let tray = undefined;
let redisClient = undefined;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  win.loadFile("index.html");
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
function createTray() {
  tray = new Tray(path.join(assetsDirectory, "foo.png"));

  const contextMenu = Menu.buildFromTemplate([
    { label: "🎭 Available", type: "radio" },
    { label: "🙉 Concentrated", type: "radio" },
    { label: "🚽 Not here", type: "radio", checked: true },
  ]);
  // tray.setToolTip("This is my application.");
  tray.setContextMenu(contextMenu);
}

function connectRedis() {
  redisClient = redis.createClient({
    host: "haminet.9agqsm.0001.usw2.cache.amazonaws.com",
  });
}

function createPlayerWindow() {
  const playerWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInSession(session.defaultSession);
    blocker.enableBlockingInSession(playerWindow.webContents.session);
    // and load the index.html of the app.
    playerWindow.loadFile("player.html");
  });
}

// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ElectronBlocker.fromLists(fetch, [
    "https://easylist.to/easylist/easylist.txt",
  ]).then(() => {
    connectRedis();
    redisClient.get("foo", (err, data) => {
      if (err) {
        throw err;
      }
      console.log(data);
    });
    createTray();
    createWindow();
    createPlayerWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 1) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
