const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("agricontoDesktop", {
  platform: process.platform,
  appName: "AgriConto Pro",
  apiUrl: process.env.VITE_API_URL || "http://127.0.0.1:8001/api/v1"
});
