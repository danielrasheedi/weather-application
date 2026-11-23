const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://weathermy.vercel.app/api/weather';

// Where saved data lives. The packaged app's own folder is read-only (app.asar),
// so it uses the user's AppData folder; during development it uses ./data.
const dataDir = app.isPackaged ? app.getPath('userData') : path.join(__dirname, 'data');

// Path to the JSON file that stores saved locations
const locationsFilePath = path.join(dataDir, 'weather-locations.json');

// Path to the JSON file that stores user settings (units)
const settingsFilePath = path.join(dataDir, 'weather-settings.json');

let mainWindow; // Reference to the main application window

function createMainWindow() {
  // Open at 1920x1080, or smaller if the screen (minus the taskbar) is smaller
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1920, screenWidth),
    height: Math.min(1080, screenHeight),
    minWidth: 360,  // The layout adapts down to phone-sized widths
    minHeight: 480,
    center: true,
    title: 'Weather',
    resizable: true,
    webPreferences: {
      // Pages get no Node.js access; they talk to this process only through preload.js
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  mainWindow.loadFile('renderer/home/read-home.html'); // Load the forecast page
}

// Creates the data files with defaults on first run (they are not stored in git)
function ensureDataFiles() {
  fs.mkdirSync(path.dirname(locationsFilePath), { recursive: true });
  if (!fs.existsSync(locationsFilePath)) {
    const defaultLocations = [{ query: 'Kuala Lumpur', alias: '', isPrimary: true }];
    fs.writeFileSync(locationsFilePath, JSON.stringify(defaultLocations, null, '\t'));
  }
  if (!fs.existsSync(settingsFilePath)) {
    const defaultSettings = { temperature: 'C', distance: 'km', precipitation: 'mm', speed: 'km/h', pressure: 'mb' };
    fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, '\t'));
  }
}

// Initialize the app when electron is ready
app.whenReady().then(() => {
  ensureDataFiles();
  createMainWindow();
});

// IPC Handlers for location operations
// Returns the array of saved locations from the JSON file
ipcMain.handle('get-locations', async () => {
  try {
    const data = fs.readFileSync(locationsFilePath, 'utf-8');
    return JSON.parse(data); // Return parsed array of location objects
  } catch (error) {
    return []; // Return empty array if file doesn't exist or is invalid
  }
});

// Adds a new location to the saved locations array
ipcMain.handle('add-location', async (event, query) => {
  try {
    const data = fs.readFileSync(locationsFilePath, 'utf-8');
    const locations = JSON.parse(data);
    // Create new location object; set as primary if it's the only location
    const newLocation = { query: query, alias: '', isPrimary: locations.length === 0 };
    locations.push(newLocation);
    // Write updated array back to JSON file with formatting
    fs.writeFileSync(locationsFilePath, JSON.stringify(locations, null, '\t'));
    return locations; // Return updated locations array
  } catch (error) {
    return [];
  }
});

// Removes a location from the saved locations by index
ipcMain.handle('delete-location', async (event, index) => {
  try {
    const data = fs.readFileSync(locationsFilePath, 'utf-8');
    const locations = JSON.parse(data);
    locations.splice(index, 1); // Remove the location at the given index
    // If only one location remains, force it to be primary
    if (locations.length === 1) {
      locations[0].isPrimary = true;
    }
    fs.writeFileSync(locationsFilePath, JSON.stringify(locations, null, '\t'));
    return locations;
  } catch (error) {
    return [];
  }
});

// Modifies nickname and primary status of a location
ipcMain.handle('update-location', async (event, index, alias, isPrimary) => {
  try {
    const data = fs.readFileSync(locationsFilePath, 'utf-8');
    const locations = JSON.parse(data);
    // If setting as primary, first unset all other locations
    if (isPrimary) {
      locations.forEach((loc) => (loc.isPrimary = false));
    }
    locations[index].alias = alias;       // Update the alias/nickname
    locations[index].isPrimary = isPrimary; // Update primary status
    fs.writeFileSync(locationsFilePath, JSON.stringify(locations, null, '\t'));
    return locations;
  } catch (error) {
    return [];
  }
});

// Fetches the forecast through the Weather web API (api/weather.js on Vercel),
// so the WeatherAPI key stays on the server and is never shipped inside the app
ipcMain.handle('fetch-weather', async (event, query) => {
  try {
    const url = WEATHER_API_URL + '?q=' + encodeURIComponent(query);
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return response.ok ? await response.json() : null;
  } catch (error) {
    return null; // No internet, server unreachable, or no reply within 10 seconds
  }
});

// IPC handlers for settings (units)
// Returns the user's saved unit preferences.
ipcMain.handle('get-settings', async () => {
  try {
    const data = fs.readFileSync(settingsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default settings if file doesn't exist
    return {
      temperature: 'C',
      distance: 'km',
      precipitation: 'mm',
      speed: 'km/h',
      pressure: 'mb',
    };
  }
});

// Saves the user's unit preferences to the settings file.
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, '\t'));
    return settings;
  } catch (error) {
    return null;
  }
});