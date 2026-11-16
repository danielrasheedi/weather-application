// Fetches forecast data from WeatherAPI.com. Used by the desktop app (main.js)
// and by the website's /api/weather function, so the key never reaches a page.
const fs = require('fs');
const path = require('path');

// Reads WEATHERAPI_KEY from the environment, or from the local .env file
function getApiKey() {
  if (process.env.WEATHERAPI_KEY) return process.env.WEATHERAPI_KEY.trim();
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '..', '.env'), 'utf-8');
    const match = env.match(/^\s*WEATHERAPI_KEY\s*=\s*(.+?)\s*$/m);
    return match ? match[1].replace(/^["']|["']$/g, '') : '';
  } catch (error) {
    return '';
  }
}

// Returns { status, data } where data is the forecast JSON or an { error } object
async function getForecast(query) {
  const q = String(query || '').trim();
  if (!q || q.length > 100) return { status: 400, data: { error: 'Enter a place name (up to 100 characters).' } };

  const key = getApiKey();
  if (!key) return { status: 500, data: { error: 'WEATHERAPI_KEY is not set.' } };

  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      // Pass on WeatherAPI's message (e.g. "No matching location found.") but never the key
      const message = (data && data.error && data.error.message) || 'Weather service error.';
      return { status: response.status === 400 ? 404 : 502, data: { error: message } };
    }
    return { status: 200, data };
  } catch (error) {
    return { status: 502, data: { error: 'Could not reach the weather service.' } };
  }
}

module.exports = { getForecast };
