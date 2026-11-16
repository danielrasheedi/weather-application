// Variables to track which location is being edited or deleted
let currentEditIndex = -1;   // Index of the location being edited
let currentDeleteIndex = -1; // Index of the location being deleted
let currentPrimaryVal = false; // Current primary toggle value in update modal

// Fetches weather data for a specific location query from WeatherAPI.
async function fetchWeather(query) {
  return WeatherPlatform.fetchWeather(query); // no API key in the page
}

// Loads all saved locations, fetches their weather data, and renders location cards in the grid.
async function loadLocations() {
  const locations = await WeatherPlatform.invoke('get-locations');
  const settings = await WeatherPlatform.invoke('get-settings');
  const tempUnit = settings.temperature || 'C';
  const grid = document.getElementById('locations-grid');
  grid.innerHTML = ''; // Clear existing cards

  // Fetch weather for all locations in parallel
  const weatherPromises = locations.map((loc) => fetchWeather(loc.query));
  const weatherResults = await Promise.all(weatherPromises);

  // Create a card for each saved location
  locations.forEach((loc, index) => {
    const data = weatherResults[index];
    const card = document.createElement('div');
    card.className = 'location-card';

    if (data) {
      const current = data.current;
      const location = data.location;
      const tempVal = tempUnit === 'F' ? Math.round(current.temp_f) : Math.round(current.temp_c);
      const feelsVal = tempUnit === 'F' ? Math.round(current.feelslike_f) : Math.round(current.feelslike_c);
      // Build country display with alias if present
      const aliasText = loc.alias ? ` (${loc.alias})` : '';

      // Hide delete button if this is the only saved location
      const deleteBtn = locations.length > 1
        ? `<button class="delete-btn" title="Delete location" onclick="event.stopPropagation(); openDeleteModal(${index}, '${loc.query}')">
            <img src="../../graphics/Exit.svg" alt="Delete">
          </button>`
        : '';

      card.innerHTML = `
        <div class="loc-city">${location.name},</div>
        <div class="loc-country">${location.country}${aliasText}</div>
        <div class="loc-temp">${tempVal}°<span class="loc-unit">${tempUnit}</span></div>
        <div class="loc-condition">${current.condition.text}</div>
        <div class="loc-feels">Feels like ${feelsVal}°${tempUnit}</div>
        ${deleteBtn}
        <button class="edit-btn" title="Edit location" onclick="event.stopPropagation(); openUpdateModal(${index})">
          <img src="../../graphics/Pencil.svg" alt="Edit">
        </button>
      `;

      // navigates to forecast page for that location
      card.addEventListener('click', () => {
        sessionStorage.setItem('selectedLocationQuery', loc.query);
        window.location.href = '../home/read-home.html';
      });
    } else {
      // Show error state if weather fetch failed
      const errorDeleteBtn = locations.length > 1
        ? `<button class="delete-btn" title="Delete location" onclick="event.stopPropagation(); openDeleteModal(${index}, '${loc.query}')">
            <img src="../../graphics/Exit.svg" alt="Delete">
          </button>`
        : '';
      card.innerHTML = `
        <div class="loc-city">${loc.query}</div>
        <div class="loc-country">Error loading data</div>
        ${errorDeleteBtn}
      `;
    }

    grid.appendChild(card);
  });

  // "Add more locations" card at the end
  const addCard = document.createElement('div');
  addCard.className = 'add-location-card';
  addCard.textContent = 'Add more locations';
  addCard.addEventListener('click', openCreateModal);
  grid.appendChild(addCard);
}

/** Opens the "New location" modal dialog. */
function openCreateModal() {
  document.getElementById('create-input').value = '';
  document.getElementById('create-modal').classList.add('active');
}

/** Closes the "New location" modal dialog. */
function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('active');
}

// Submits the new location by adding it to the saved locations file.
async function submitCreate() {
  const query = document.getElementById('create-input').value.trim();
  if (!query) return; // Don't submit empty input
  await WeatherPlatform.invoke('add-location', query);
  closeCreateModal();
  loadLocations(); // Refresh the grid to show the new location
}

// Opens the "Edit information" modal for the location at the given index.
async function openUpdateModal(index) {
  const locations = await WeatherPlatform.invoke('get-locations');
  const loc = locations[index];
  currentEditIndex = index;
  currentPrimaryVal = loc.isPrimary;

  // Populate modal fields with current values
  document.getElementById('update-subtitle').textContent =
    `${loc.query}, ${loc.alias || ''}`;

  // Fetch location details to show country
  const data = await fetchWeather(loc.query);
  if (data) {
    document.getElementById('update-subtitle').textContent =
      `${data.location.name}, ${data.location.country}`;
  }

  document.getElementById('update-alias-input').value = loc.alias || '';

  // If only one location exists, force it to be primary and disable toggle
  if (locations.length === 1) {
    currentPrimaryVal = true;
    document.getElementById('toggle-yes').disabled = true;
    document.getElementById('toggle-no').disabled = true;
    document.getElementById('toggle-no').style.opacity = '0.3';
    document.getElementById('toggle-no').style.cursor = 'not-allowed';
  } else {
    document.getElementById('toggle-yes').disabled = false;
    document.getElementById('toggle-no').disabled = false;
    document.getElementById('toggle-no').style.opacity = '';
    document.getElementById('toggle-no').style.cursor = '';
  }

  updatePrimaryToggle(currentPrimaryVal);
  document.getElementById('update-modal').classList.add('active');
}

/** Closes the "Edit information" modal dialog. */
function closeUpdateModal() {
  document.getElementById('update-modal').classList.remove('active');
}

// Sets the primary location toggle value.
function setPrimary(val) {
  currentPrimaryVal = val;
  updatePrimaryToggle(val);
}

// Updates the visual state of the toggle buttons.
function updatePrimaryToggle(val) {
  const yesBtn = document.getElementById('toggle-yes');
  const noBtn = document.getElementById('toggle-no');
  if (val) {
    yesBtn.classList.add('active');
    noBtn.classList.remove('active');
  } else {
    yesBtn.classList.remove('active');
    noBtn.classList.add('active');
  }
}

// Submits the updated location data (alias and primary status).
async function submitUpdate() {
  const alias = document.getElementById('update-alias-input').value.trim();
  await WeatherPlatform.invoke('update-location', currentEditIndex, alias, currentPrimaryVal);
  closeUpdateModal();
  loadLocations(); // Refresh the grid to reflect changes
}

// Opens the "Delete?" confirmation modal for the given location.
function openDeleteModal(index, name) {
  currentDeleteIndex = index;
  document.getElementById('delete-input').value = name;
  document.getElementById('delete-modal').classList.add('active');
}

/** Closes the "Delete?" confirmation modal. */
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('active');
}

// Confirms and executes the deletion of the selected location.
async function confirmDelete() {
  await WeatherPlatform.invoke('delete-location', currentDeleteIndex);
  closeDeleteModal();
  loadLocations();
}

loadLocations();
