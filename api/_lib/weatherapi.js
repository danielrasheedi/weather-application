// Fetches forecast data from WeatherAPI.com. Used by the /api/weather function
// (on Vercel, and locally by npm run web), so the key stays on the server.

// The key comes only from the WEATHERAPI_KEY environment variable (set in Vercel)
function getApiKey() {
  return (process.env.WEATHERAPI_KEY || '').trim();
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
