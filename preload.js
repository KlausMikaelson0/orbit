/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("orbitDesktop", {
  isElectron: true,
  platform: process.platform,
  electronVersion: process.versions.electron,
});
