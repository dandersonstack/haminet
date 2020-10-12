const {
  app,
  screen,
  BrowserWindow,
  Tray,
  Menu,
  session,
  ipcMain,
} = require("electron");
const path = require("path");
const redis = require("redis");
const { ElectronBlocker } = require("@cliqz/adblocker-electron");
const { fetch } = require("cross-fetch");
//
// require("electron-reload")(__dirname, {
//   electron: path.join(
//     __dirname,
//     "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
//   ),
// });

const assetsDirectory = path.join(__dirname, "assets");

let win = undefined;
let tray = undefined;
let redisClient = undefined;

function createWindow() {
  let display = screen.getPrimaryDisplay();
  let width = display.bounds.width;

  win = new BrowserWindow({
    width: 500,
    height: 300,
    x: width - 500,
    y: 0,
    // frame: false,
    // transparent: true,
    show: true,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInSession(session.defaultSession);
    blocker.enableBlockingInSession(win.webContents.session);
    // and load the index.html of the app.
    // win.loadURL("https://drorwolmer.github.io/haminet/").then(() => {});
    // win.loadURL("https://drorwolmer.github.io/haminet/").then(() => {});
    win.loadFile("index.html");
  });

  // win.loadFile("index.html").then(() => {});

  win.webContents.on("did-finish-load", () => {
    redisClient.get("youtube:id", (err, data) => {
      if (err) {
        throw err;
      }
      win.webContents.send("youtube:id", JSON.parse(data));
    });
  });

  ipcMain.on("youtube:id", (event, input, output) => {
    // let timestamp = Date.now();
    redisClient.set("youtube:id", JSON.stringify(input), (err, data) => {
      if (err) {
        throw err;
      }
    });
  });

  win.on("close", (event) => {
    if (win.isVisible()) {
      event.preventDefault();
      win.hide();
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
function createTray() {
  tray = new Tray(path.join(assetsDirectory, "foo.png"));
  tray.setIgnoreDoubleClickEvents(true);
  //
  // const contextMenu = Menu.buildFromTemplate([
  //   { label: "🎭 Availables", type: "radio" },
  //   { label: "🙉 Concentrated", type: "radio" },
  //   { label: "🚽 Not here", type: "radio", checked: true },
  // ]);
  // // tray.setToolTip("This is my application.");
  // tray.setContextMenu(contextMenu);

  tray.on("click", function (e) {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }
  });
}

function connectRedis() {
  redisClient = redis.createClient({
    host: "haminet.9agqsm.0001.usw2.cache.amazonaws.com",
  });
}

// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  connectRedis();
  createTray();
  createWindow();
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
  if (!win.isVisible()) {
    win.show();
  }
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  // if (BrowserWindow.getAllWindows().length === 0) {
  //   createWindow();
  // }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
