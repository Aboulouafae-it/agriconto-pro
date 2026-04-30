const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("agricontoDesktop", {
  platform: process.platform,
  appName: "AgriConto Pro"
});

