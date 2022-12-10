/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 * 
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

const {contextBridge, ipcRenderer} = require("electron")

contextBridge.exposeInMainWorld(
  "api", {
    refreshWorkInfo: (month, student_id, password, params) => {
      console.log("Requesting API", month);
      ipcRenderer.send("refreshWorkInfoInMain", {month: month, student_id: student_id, password: password});
      // params.callback(1234)
    },
    startWorkInfoListener: (func) => {
      ipcRenderer.on('getWorkInfoFromMain', (event, ...args) => func(event, ...args));
    },
    getAuth: () => {
      // ipcRenderer.send('getAuthDataMain', (event, ...args) => func(event, ...args));
      ipcRenderer.send("getAuthDataMain", 1);
    },
    startAuthListener: (func) => {
      ipcRenderer.on('getAuthInfoFromMain', (event, ...args) => func(event, ...args));
    },
  }
)