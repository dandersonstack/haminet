const {
  app,
  screen,
  BrowserWindow,
  Tray,
  session,
  ipcMain,
} = require("electron");
const path = require("path");
const redis = require("redis");
const { ElectronBlocker } = require("@cliqz/adblocker-electron");
const { fetch } = require("cross-fetch");
const { menubar } = require("menubar");

const assetsDirectory = path.join(__dirname, "assets");

const mb = menubar({
  preloadWindow: true,
  icon: path.join(assetsDirectory, "foo.png"),
  browserWindow: {
    icon: path.join(assetsDirectory, "foo.png"),
    webPreferences: {
      nodeIntegration: true,
    },
  },
});

// Global Objects
let mainWindow = undefined;
let tray = undefined;
let redisClient = undefined;
let lastPublishedTimestamp = undefined;

function createWindow() {
  let display = screen.getPrimaryDisplay();
  let width = display.bounds.width;

  mainWindow = mb.window;

  // mainWindow = new BrowserWindow({
  //   width: 500,
  //   height: 320,
  //   x: width - 500,
  //   y: 0,
  //   frame: false,
  //   transparent: true,
  //   titleBarStyle: "hidden",
  //   show: true,
  //   webPreferences: {
  //     nodeIntegration: true,
  //   },
  // });

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInSession(session.defaultSession);
    blocker.enableBlockingInSession(mainWindow.webContents.session);
    // and load the index.html of the app.
    // mainWindow.loadURL("https://drorwolmer.github.io/haminet/").then(() => {});
    mainWindow.loadFile("index.html");
  });

  // mainWindow.loadFile("index.html").then(() => {});

  mainWindow.webContents.on("did-finish-load", () => {
    redisClient.get("youtube:id", (err, data) => {
      if (err) {
        throw err;
      }
      mainWindow.webContents.send("youtube:id", JSON.parse(data));
    });
  });

  ipcMain.on("youtube:id", (event, input, output) => {
    // let timestamp = Date.now();
    redisClient.set("youtube:id", JSON.stringify(input), (err, data) => {
      if (err) {
        throw err;
      }
    });
    lastPublishedTimestamp = Date.now();
    redisClient.publish(
      "foo",
      JSON.stringify({
        msgType: "youtube:change",
        timestamp: lastPublishedTimestamp,
        data: input,
      }),
      (err, data) => {
        if (err) {
          throw err;
        }
      }
    );
  });

  // mainWindow.on("close", (event) => {
  //   if (mainWindow.isVisible()) {
  //     event.preventDefault();
  //     mainWindow.hide();
  //   }
  // });
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
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

function connectRedis() {
  redisClient = redis.createClient({
    host: "haminet.9agqsm.0001.usw2.cache.amazonaws.com",
  });

  redisClientSubscriber = redis.createClient({
    host: "haminet.9agqsm.0001.usw2.cache.amazonaws.com",
  });

  function updatePeopleCounts() {
    redisClient.pubsub("NUMSUB", "foo", (err, data) => {
      if (err) {
        throw err;
      }
      let [channel, nSubscribers] = data;
      mainWindow.webContents.send("nSubscribers", nSubscribers);
    });
  }
  updatePeopleCounts();
  setInterval(updatePeopleCounts, 3000);

  redisClientSubscriber.on("message", (channel, message) => {
    let { timestamp, msgType, data } = JSON.parse(message);

    console.error(timestamp, msgType, data);

    // Skip messages that we published
    if (timestamp === lastPublishedTimestamp) return;

    if (msgType === "youtube:change") {
      mainWindow.webContents.send("youtube:id", data);
    }
  });
  redisClientSubscriber.subscribe("foo");
}

// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  connectRedis();
  // createTray();
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
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  // if (BrowserWindow.getAllWindows().length === 0) {
  //   createWindow();
  // }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
