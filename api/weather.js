// Vercel function: GET /api/weather?q=<place>
// Calls WeatherAPI.com with the key stored in Vercel's environment variables.
const { getForecast } = require('./_lib/weatherapi');

module.exports = async (req, res) => {
  const { searchParams } = new URL(req.url, 'http://localhost');
  const { status, data } = await getForecast(searchParams.get('q'));

  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Share results for 5 minutes to save API calls; errors are not cached
  res.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=300, max-age=60' : 'no-store');
  res.end(JSON.stringify(data));
};
