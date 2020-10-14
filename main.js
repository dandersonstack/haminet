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
const { promisify } = require("util");
const { ElectronBlocker } = require("@cliqz/adblocker-electron");
const { fetch } = require("cross-fetch");
const { menubar } = require("menubar");
const crypto = require("crypto");

// const iv = crypto.randomBytes(16);
// function encrypt(text) {
//  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
//  let encrypted = cipher.update(text);
//  encrypted = Buffer.concat([encrypted, cipher.final()]);
//  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
// }

const key = crypto.scryptSync("ORIMOTI_420_PRAISE_RUHAMA", "hamin", 32);

function decrypt(text) {
  let iv = Buffer.from(text.iv, "hex");
  let encryptedText = Buffer.from(text.encryptedData, "hex");
  let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const redis_server_address = decrypt({
  iv: "17f9dd9768409458f00b773ffab1a735",
  encryptedData:
    "18aa995315e41eacd1f096846225c90165f281d36a67536c3ee53df73d7d2218c9bdc06a0a73e07e4e796c77584bf54c07081d56c7a998978f985db3591b6952f523b6a7bd58eba204c69b8cdf9b0be6aae6f5ad9cd659a7ff566e3d94c96c86fe04a31b69671e000d30c5f1e8ace30a",
});

const assetsDirectory = path.join(__dirname, "assets");

const mb = menubar({
  // index: "https://drorwolmer.github.io/haminet/",
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
let redisClient = undefined;
let redisClientSubscriber = undefined;
let lastPublishedTimestamp = undefined;

function createWindow() {
  mainWindow = mb.window;

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
    blocker.enableBlockingInSession(session.defaultSession);
    blocker.enableBlockingInSession(mainWindow.webContents.session);
  });

  const getAsync = promisify(redisClient.get).bind(redisClient);
  const setAsync = promisify(redisClient.set).bind(redisClient);
  const pubsubAsync = promisify(redisClient.pubsub).bind(redisClient);
  const publishAsync = promisify(redisClient.publish).bind(redisClient);

  ipcMain.handle("redis_get", async (event, arg) => {
    console.error(`redis_get(${arg})`);
    let data = await getAsync(arg);
    return JSON.parse(data);
  });

  ipcMain.handle("redis_set", async (event, [key, data]) => {
    console.error(`redis_set(${key}, ${JSON.stringify(data)})`);
    return await setAsync(key, JSON.stringify(data));
  });

  ipcMain.handle("numsub", async (event, arg) => {
    console.error(`numsub(${arg})`);
    let [channel, nSubscribers] = await pubsubAsync("NUMSUB", arg);
    return {
      channel: channel,
      nSubscribers: nSubscribers,
    };
  });

  ipcMain.handle("publish", async (event, [channel, data]) => {
    console.error(`publish(${channel}, ${JSON.stringify(data)})`);
    return await publishAsync(channel, JSON.stringify(data));
  });

  ipcMain.handle("subscribe", (event, channel) => {
    console.error(`subscribe(${channel})`);
    redisClientSubscriber.subscribe(channel);
  });
}

function connectRedis() {
  redisClient = redis.createClient(redis_server_address);
  redisClientSubscriber = redis.createClient(redis_server_address);

  redisClientSubscriber.on("message", (channel, message) => {
    console.error(`onMessage(${channel}, ${message})`);
    mainWindow.webContents.send(channel, JSON.parse(message));
  });
}

// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  connectRedis();
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
