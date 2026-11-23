// Runs before each page loads, in an isolated context (contextIsolation: true).
// Gives the pages one small, safe function instead of full Node.js access:
//   window.weatherDesktop.invoke(channel, ...args)
// Only the channels listed below can reach main.js.
const { contextBridge, ipcRenderer } = require('electron');

const ALLOWED_CHANNELS = [
  'get-locations',
  'add-location',
  'delete-location',
  'update-location',
  'fetch-weather',
  'get-settings',
  'save-settings',
];

contextBridge.exposeInMainWorld('weatherDesktop', {
  invoke: (channel, ...args) => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      return Promise.reject(new Error('Unknown action: ' + channel));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
});
