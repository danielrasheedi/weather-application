// Activities categorised by weather suitability
const outdoorActivities = [
  { name: 'Cycling', type: 'Outdoor activity', icon: 'cycling' },
  { name: 'Tennis', type: 'Outdoor activity', icon: 'tennis' },
  { name: 'Badminton', type: 'Outdoor activity', icon: 'badminton' },
  { name: 'Basketball', type: 'Outdoor activity', icon: 'basketball' },
  { name: 'Volleyball', type: 'Outdoor activity', icon: 'volleyball' },
  { name: 'Hiking', type: 'Outdoor activity', icon: 'hiking' },
  { name: 'Swimming', type: 'Outdoor activity', icon: 'swimming' },
  { name: 'Football', type: 'Outdoor activity', icon: 'football' },
  { name: 'Golf', type: 'Outdoor activity', icon: 'golf' },
  { name: 'Picnic', type: 'Outdoor activity', icon: 'picnic' },
];

const indoorActivities = [
  { name: 'Reading', type: 'Indoor activity', icon: 'reading' },
  { name: 'Cooking', type: 'Indoor activity', icon: 'cooking' },
  { name: 'Gaming', type: 'Indoor activity', icon: 'gaming' },
  { name: 'Yoga', type: 'Indoor activity', icon: 'yoga' },
  { name: 'Painting', type: 'Indoor activity', icon: 'painting' },
  { name: 'Board Games', type: 'Indoor activity', icon: 'board-games' },
  { name: 'Movie', type: 'Indoor activity', icon: 'movie' },
  { name: 'Baking', type: 'Indoor activity', icon: 'baking' },
  { name: 'Meditation', type: 'Indoor activity', icon: 'meditation' },
  { name: 'Puzzles', type: 'Indoor activity', icon: 'puzzles' },
];

function getRecommendations(current) {
  const condition = current.condition.text.toLowerCase();
  const temp = current.temp_c;
  const chanceOfRain = current.humidity > 80;
  // Check if weather is suitable for outdoor activities
  const isGoodWeather =
    (condition.includes('clear') ||
      condition.includes('sunny') ||
      condition.includes('partly cloudy') ||
      condition.includes('overcast')) &&
    !condition.includes('rain') &&
    !condition.includes('snow') &&
    !condition.includes('storm') &&
    temp >= 15 &&
    temp <= 35;

  if (isGoodWeather) {
    // Return first 5 outdoor activities for good weather
    return outdoorActivities.slice(0, 5);
  } else if (condition.includes('rain') || condition.includes('snow') || condition.includes('storm')) {
    // Return first 5 indoor activities for bad weather
    return indoorActivities.slice(0, 5);
  } else {
    // Return 3 outdoor + 2 indoor for mixed weather
    return [...outdoorActivities.slice(0, 3), ...indoorActivities.slice(0, 2)];
  }
}

// Fetches weather data for the given location query from WeatherAPI.
async function fetchWeatherData(query) {
  return WeatherPlatform.fetchWeather(query); // no API key in the page
}

// Loads and displays the forecast for the primary location.
async function loadForecast() {
  // Check if a specific location was selected from the locations page
  let query = sessionStorage.getItem('selectedLocationQuery');

  if (!query) {
    // Find the primary location from saved locations
    const locations = await WeatherPlatform.invoke('get-locations');
    const primary = locations.find((loc) => loc.isPrimary);
    const selectedLoc = primary || (locations.length > 0 ? locations[0] : null);
    query = selectedLoc ? selectedLoc.query : 'Kuala Lumpur';
    var locationAlias = selectedLoc ? selectedLoc.alias : '';
  } else {
    // If a specific location was selected, find its alias
    const locations = await WeatherPlatform.invoke('get-locations');
    const matchedLoc = locations.find((loc) => loc.query === query);
    var locationAlias = matchedLoc ? matchedLoc.alias : '';
  }

  // Get unit preferences
  const settings = await WeatherPlatform.invoke('get-settings');
  const tempUnit = settings.temperature || 'C'; // 'C' or 'F'
  const distUnit = settings.distance || 'km';   // 'km' or 'mi'
  const precipUnit = settings.precipitation || 'mm'; // 'mm' or 'in'
  const speedUnit = settings.speed || 'km/h';   // 'km/h', 'mph', 'm/s', 'knots'
  const pressureUnit = settings.pressure || 'mb'; // 'mb', 'mmHg', 'inHg'

  // Fetch weather data from the API
  const data = await fetchWeatherData(query);
  if (!data) {
    document.getElementById('forecast-location').textContent = 'Error loading data';
    return;
  }

  const { location, current, forecast } = data;
  const hourlyData = forecast.forecastday[0].hour; // 24 hourly entries

  // Update page title
  const aliasText = locationAlias ? ` (${locationAlias})` : '';
  document.getElementById('forecast-location').textContent =
    `${location.name}, ${location.country}${aliasText}`;

  // Current weather
  const tempValue = tempUnit === 'F' ? current.temp_f : current.temp_c;
  const feelsValue = tempUnit === 'F' ? current.feelslike_f : current.feelslike_c;

  const currentTemp = document.getElementById('current-temp');
  currentTemp.textContent = `${Math.round(tempValue)}°`;
  currentTemp.appendChild(WeatherPlatform.el('span', 'temp-unit', tempUnit));
  document.getElementById('current-condition').textContent = current.condition.text;
  document.getElementById('current-feels').textContent =
    `Feels like ${Math.round(feelsValue)}°${tempUnit}`;

  // Weather detail values
  // Precipitation
  const precipVal = precipUnit === 'in' ? current.precip_in + 'in' : current.precip_mm + 'mm';
  document.getElementById('detail-precip').textContent = precipVal;

  // Wind speed with unit conversion
  let windVal;
  switch (speedUnit) {
    case 'mph': windVal = current.wind_mph + 'mph'; break;
    case 'm/s': windVal = (current.wind_kph / 3.6).toFixed(1) + 'm/s'; break;
    case 'knots': windVal = (current.wind_mph * 0.868976).toFixed(1) + 'knots'; break;
    default: windVal = current.wind_kph + 'km/h'; break;
  }
  document.getElementById('detail-wind').textContent = windVal;

  // Humidity percentage
  document.getElementById('detail-humidity').textContent = current.humidity + '%';

  // UV index
  document.getElementById('detail-uv').textContent = current.uv;

  // Visibility with unit conversion
  const visVal = distUnit === 'mi' ? current.vis_miles + 'mi' : current.vis_km + 'km';
  document.getElementById('detail-visibility').textContent = visVal;

  // Gust speed with unit conversion
  let gustVal;
  switch (speedUnit) {
    case 'mph': gustVal = current.gust_mph + 'mph'; break;
    case 'm/s': gustVal = (current.gust_kph / 3.6).toFixed(1) + 'm/s'; break;
    case 'knots': gustVal = (current.gust_mph * 0.868976).toFixed(1) + 'knots'; break;
    default: gustVal = current.gust_kph + 'km/h'; break;
  }
  document.getElementById('detail-gust').textContent = gustVal;

  // Dewpoint temperature
  const dewVal = tempUnit === 'F' ? current.dewpoint_f : current.dewpoint_c;
  document.getElementById('detail-dewpoint').textContent = `${dewVal}°${tempUnit}`;

  // Pressure with unit conversion
  let pressVal;
  switch (pressureUnit) {
    case 'mmHg': pressVal = (current.pressure_mb * 0.750062).toFixed(0) + 'mmHg'; break;
    case 'inHg': pressVal = current.pressure_in + 'inHg'; break;
    default: pressVal = current.pressure_mb + 'mb'; break;
  }
  document.getElementById('detail-pressure').textContent = pressVal;

  // Hourly forecast cards (00:00 to 23:00)
  const hourlyContainer = document.getElementById('hourly-container');
  hourlyContainer.innerHTML = ''; // Clear existing cards

  hourlyData.forEach((hour) => {
    const time = hour.time.split(' ')[1];
    const hourTemp = tempUnit === 'F' ? Math.round(hour.temp_f) : Math.round(hour.temp_c);
    // Use 128x128px icons instead of default 64x64
    const iconUrl = hour.condition.icon.replace('64x64', '128x128');

    // Hourly card
    const { el } = WeatherPlatform;
    const icon = el('img');
    icon.src = `https:${iconUrl}`;
    icon.alt = hour.condition.text;
    const iconBox = el('div', 'hour-icon');
    iconBox.appendChild(icon);

    const card = el('div', 'hourly-card');
    card.append(
      el('div', 'hour-time', time),
      iconBox,
      el('div', 'hour-temp', `${hourTemp}°`),
      el('div', 'hour-condition', hour.condition.text.trim()),
      el('div', 'hour-rain', `☁ ${hour.chance_of_rain}%`),
    );
    hourlyContainer.appendChild(card);
  });

  // Activity recommendations
  const recommendations = getRecommendations(current);
  const recsContainer = document.getElementById('recommendations-container');
  recsContainer.innerHTML = ''; // Clear existing cards

  recommendations.forEach((rec) => {
    const { el } = WeatherPlatform;
    const icon = el('img', 'rec-icon');
    icon.src = `../../graphics/activities/${rec.icon}.svg`;
    icon.alt = '';

    const card = el('div', 'recommendation-card');
    card.append(icon, el('div', 'rec-name', rec.name), el('div', 'rec-type', rec.type));
    recsContainer.appendChild(card);
  });
}

// Let a normal mouse wheel scroll the hourly forecast sideways
const hourlyForecast = document.querySelector('.hourly-forecast');
hourlyForecast.addEventListener('wheel', (event) => {
  const canScroll = hourlyForecast.scrollWidth > hourlyForecast.clientWidth;
  if (canScroll && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    event.preventDefault(); // Scroll the hours instead of the page
    hourlyForecast.scrollLeft += event.deltaY;
  }
}, { passive: false });

loadForecast();