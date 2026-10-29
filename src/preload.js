// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fs25', {
  getProfiles: () => ipcRenderer.invoke('fs25:getProfiles'),
  getActiveProfile: () => ipcRenderer.invoke('fs25:getActiveProfile'),
  setActiveProfile: (profileName) => ipcRenderer.invoke('fs25:setActiveProfile', profileName),
  createProfile: (name) => ipcRenderer.invoke('fs25:createProfile', name),
  getMods: (profileName) => ipcRenderer.invoke('fs25:getMods', profileName),
  getModIcon: (mod) => ipcRenderer.invoke('fs25:getModIcon', mod),
  repairLinks: (profile) => ipcRenderer.invoke('fs25:repairLinks', profile),
  removeLinks: (profile) => ipcRenderer.invoke('fs25:removeLinks', profile),
  getExcludedMods: (profile) => ipcRenderer.invoke('fs25:getExcludedMods', profile),
  openProfileFolder: (profile) => ipcRenderer.invoke('fs25:openProfileFolder', profile),
  toggleExcludedMod: (profile, fileName) => ipcRenderer.invoke('fs25:toggleExcludedMod', profile, fileName),
  promoteToCommon: (profile, fileName) => ipcRenderer.invoke('fs25:promoteToCommon', profile, fileName),
  deleteLocalMod: (profile, fileName, options) => ipcRenderer.invoke('fs25:deleteLocalMod', profile, fileName, options),
  getFavoriteUsage: (fileName) => ipcRenderer.invoke('fs25:getFavoriteUsage', fileName),
  promoteProfileVersion: (profile, fileName) => ipcRenderer.invoke('fs25:promoteProfileVersion', profile, fileName),
  relinkFavorite: (profile, fileName) => ipcRenderer.invoke('fs25:relinkFavorite', profile, fileName),
  getAppVersion: () => ipcRenderer.invoke("app:getVersion"),
  addGithubMod: (profile, repoUrl, includePrereleases) => ipcRenderer.invoke('fs25:addGithubMod', profile, repoUrl, includePrereleases),
  checkGithubUpdates: (profile) => ipcRenderer.invoke('fs25:checkGithubUpdates', profile),
  openGithubRepo: (repoUrl) => ipcRenderer.invoke('fs25:openGithubRepo', repoUrl),
  updateGithubMod: (profile, fileName) => ipcRenderer.invoke('fs25:updateGithubMod', profile, fileName),
  launchGame: () => ipcRenderer.invoke("fs25:launchGame"),
  isGameRunning: () => ipcRenderer.invoke("fs25:isGameRunning"),
  getSettings: () => ipcRenderer.invoke("fs25:getSettings"),
  saveSettings: (settings) => ipcRenderer.invoke("fs25:saveSettings", settings),
  pickGameFolder: () => ipcRenderer.invoke("fs25:pickGameFolder"),
  pickExternalZip: () => ipcRenderer.invoke("fs25:pickExternalZip"),
  addExternalMod: (profile, zipPath, url) => ipcRenderer.invoke("fs25:addExternalMod", profile, zipPath, url),
  openExternalUrl: (url) => ipcRenderer.invoke("fs25:openExternalUrl", url),
  openModZip: (profile, fileName) => ipcRenderer.invoke("fs25:openModZip", profile, fileName)
});