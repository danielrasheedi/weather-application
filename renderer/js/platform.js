// Lets the same pages run as the desktop app (Electron) and as a website.
//  - Desktop: saved data lives in data/*.json, handled by main.js over IPC
//    (through window.weatherDesktop, which preload.js provides).
//  - Website: saved data lives in the visitor's browser (localStorage).
// Weather requests never contain the API key: both versions end up at the
// /api/weather function on the server (the desktop app goes through main.js).
(function () {
  const desktop = window.weatherDesktop || null;
  const isDesktop = !!desktop;

  const DEFAULT_SETTINGS = { temperature: 'C', distance: 'km', precipitation: 'mm', speed: 'km/h', pressure: 'mb' };
  const DEFAULT_LOCATIONS = [{ query: 'Kuala Lumpur', alias: '', isPrimary: true }];
  const LOCATIONS_KEY = 'weather-locations';
  const SETTINGS_KEY = 'weather-settings';

  // Browser storage can be unavailable (private mode, blocked site data), so never let it throw
  function readStored(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStored(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Changes last only for this page view if storage is blocked
    }
    return value;
  }

  // Website versions of the main.js handlers (same behaviour, browser storage)
  const webHandlers = {
    'get-locations': () => readStored(LOCATIONS_KEY, DEFAULT_LOCATIONS),

    'add-location': (query) => {
      const locations = webHandlers['get-locations']();
      locations.push({ query: query, alias: '', isPrimary: locations.length === 0 });
      return writeStored(LOCATIONS_KEY, locations);
    },

    'delete-location': (index) => {
      const locations = webHandlers['get-locations']();
      locations.splice(index, 1);
      if (locations.length === 1) locations[0].isPrimary = true;
      return writeStored(LOCATIONS_KEY, locations);
    },

    'update-location': (index, alias, isPrimary) => {
      const locations = webHandlers['get-locations']();
      if (!locations[index]) return locations;
      if (isPrimary) locations.forEach((loc) => (loc.isPrimary = false));
      locations[index].alias = alias;
      locations[index].isPrimary = isPrimary;
      return writeStored(LOCATIONS_KEY, locations);
    },

    'get-settings': () => ({ ...DEFAULT_SETTINGS, ...readStored(SETTINGS_KEY, {}) }),

    'save-settings': (settings) => writeStored(SETTINGS_KEY, settings),
  };

  // Same call style as ipcRenderer.invoke, on both platforms
  async function invoke(channel, ...args) {
    if (isDesktop) return desktop.invoke(channel, ...args);
    const handler = webHandlers[channel];
    if (!handler) throw new Error('Unknown action: ' + channel);
    return handler(...args);
  }

  // Returns WeatherAPI forecast data for a place, or null if it can't be loaded
  async function fetchWeather(query) {
    try {
      if (isDesktop) return await desktop.invoke('fetch-weather', query);
      const response = await fetch('/api/weather?q=' + encodeURIComponent(query));
      if (!response.ok) throw new Error('Weather request failed (' + response.status + ')');
      return await response.json();
    } catch (error) {
      console.error('Error fetching weather for', query, error);
      return null;
    }
  }

  // Draws the sidebar into #sidebar-container and highlights the current page
  function renderSidebar(activeId) {
    const container = document.getElementById('sidebar-container');
    if (!container) return;
    container.innerHTML = `
      <nav class="sidebar">
        <a class="nav-item" id="nav-forecast" href="../home/read-home.html">
          <img src="../../graphics/Weather.svg" alt="Forecast icon"> Forecast
        </a>
        <a class="nav-item" id="nav-locations" href="../location/read-location.html">
          <img src="../../graphics/Location.svg" alt="Location icon"> Locations
        </a>
        <a class="nav-item" id="nav-settings" href="../settings/update-units-settings.html">
          <img src="../../graphics/Setting.svg" alt="Settings icon"> Settings
        </a>
      </nav>`;
    const active = document.getElementById(activeId);
    if (active) active.classList.add('active');
  }

  // Creates an element with a class and plain text. Text is never parsed as HTML,
  // so place names, nicknames and API data can't inject markup or scripts.
  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  window.WeatherPlatform = { isDesktop, invoke, fetchWeather, renderSidebar, el };
})();
