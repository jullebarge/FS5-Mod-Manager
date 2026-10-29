// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fs25', {
  initialLanguage: ipcRenderer.sendSync('fs25:getLanguageSync'),
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
  getCopyTargets: (profile, fileName) => ipcRenderer.invoke('fs25:getCopyTargets', profile, fileName),
  copyModToProfiles: (profile, fileName, targetProfiles, options) =>
    ipcRenderer.invoke('fs25:copyModToProfiles', profile, fileName, targetProfiles, options),
  promoteProfileVersion: (profile, fileName) => ipcRenderer.invoke('fs25:promoteProfileVersion', profile, fileName),
  relinkFavorite: (profile, fileName) => ipcRenderer.invoke('fs25:relinkFavorite', profile, fileName),
  excludeFavorites: (profile, fileNames) => ipcRenderer.invoke('fs25:excludeFavorites', profile, fileNames),
  getSavegames: () => ipcRenderer.invoke('fs25:getSavegames'),
  setSavegameProfile: (savegameId, profile) => ipcRenderer.invoke('fs25:setSavegameProfile', savegameId, profile),
  analyzeSavegame: (profile, savegameId) => ipcRenderer.invoke('fs25:analyzeSavegame', profile, savegameId),
  getAppVersion: () => ipcRenderer.invoke("app:getVersion"),
  addGithubMod: (profile, repoUrl, includePrereleases) => ipcRenderer.invoke('fs25:addGithubMod', profile, repoUrl, includePrereleases),
  checkGithubUpdates: (profile) => ipcRenderer.invoke('fs25:checkGithubUpdates', profile),
  openGithubRepo: (repoUrl) => ipcRenderer.invoke('fs25:openGithubRepo', repoUrl),
  updateGithubMod: (profile, fileName) => ipcRenderer.invoke('fs25:updateGithubMod', profile, fileName),
  launchGame: () => ipcRenderer.invoke("fs25:launchGame"),
  isGameRunning: () => ipcRenderer.invoke("fs25:isGameRunning"),
  getIconCacheStats: () => ipcRenderer.invoke("fs25:getIconCacheStats"),
  cleanIconCache: () => ipcRenderer.invoke("fs25:cleanIconCache"),
  getSettings: () => ipcRenderer.invoke("fs25:getSettings"),
  saveSettings: (settings) => ipcRenderer.invoke("fs25:saveSettings", settings),
  pickFolder: (title, defaultPath) => ipcRenderer.invoke("fs25:pickFolder", title, defaultPath),
  pickExternalZip: () => ipcRenderer.invoke("fs25:pickExternalZip"),
  addExternalMod: (profile, zipPath, url) => ipcRenderer.invoke("fs25:addExternalMod", profile, zipPath, url),
  openExternalUrl: (url) => ipcRenderer.invoke("fs25:openExternalUrl", url),
  openModZip: (profile, fileName) => ipcRenderer.invoke("fs25:openModZip", profile, fileName)
});