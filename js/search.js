// ═══════════════════════════════════════
//  Reverse geocode
// ═══════════════════════════════════════
async function reverseGeocode(rlat, rlon) {
  try {
    const res = await fetch(`${API.nominatim}/reverse?lat=${rlat}&lon=${rlon}&format=json&accept-language=sv`);
    const d   = await res.json();
    const a   = d.address || {};
    const name   = a.city || a.town || a.village || a.municipality || 'Okänd';
    const region = a.county || a.state || '';
    locationLabel = region ? `${name}, ${region}` : name;
    document.getElementById('locationName').textContent  = locationLabel;
    document.getElementById('footerCoords').textContent  = `${rlat}°N ${rlon}°E`;
  } catch (_) {}
}

// ═══════════════════════════════════════
//  Main location search
// ═══════════════════════════════════════
const searchInput    = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');
const searchSpinner  = document.getElementById('searchSpinner');
let searchTimer = null;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { closeDropdown(); return; }
  searchTimer = setTimeout(() => doSearch(q), SEARCH_DEBOUNCE_MS);
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeDropdown(); searchInput.blur(); }
});

document.addEventListener('click', e => {
  if (!document.getElementById('searchWrap').contains(e.target)) closeDropdown();
});

async function doSearch(q) {
  searchSpinner.classList.add('show');
  try {
    const url     = `${API.nominatim}/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=se&addressdetails=1&accept-language=sv`;
    const res     = await fetch(url);
    const results = await res.json();
    renderDropdown(results);
  } catch (_) {
    searchDropdown.innerHTML = '<div class="search-empty">Sökning misslyckades</div>';
    searchDropdown.classList.add('open');
  } finally {
    searchSpinner.classList.remove('show');
  }
}

function renderDropdown(results) {
  searchDropdown.innerHTML = '';
  if (!results.length) {
    searchDropdown.innerHTML = '<div class="search-empty">Inga resultat</div>';
    searchDropdown.classList.add('open');
    return;
  }
  results.forEach(r => {
    const a    = r.address || {};
    const name = a.city || a.town || a.village || a.municipality || r.display_name.split(',')[0];
    const sub  = [a.county, a.state].filter(Boolean).join(', ') || r.type;
    const el   = document.createElement('div');
    el.className = 'search-result';
    // XSS fix: build with textContent instead of innerHTML
    const nameDiv = document.createElement('div');
    nameDiv.className   = 'search-result-name';
    nameDiv.textContent = name;
    const subDiv = document.createElement('div');
    subDiv.className   = 'search-result-sub';
    subDiv.textContent = sub;
    el.appendChild(nameDiv);
    el.appendChild(subDiv);
    el.addEventListener('click', () => {
      lat = Math.round(parseFloat(r.lat) * 1e4) / 1e4;
      lon = Math.round(parseFloat(r.lon) * 1e4) / 1e4;
      locationLabel = sub ? `${name}, ${sub}` : name;
      document.getElementById('locationName').textContent  = locationLabel;
      document.getElementById('footerCoords').textContent  = `${lat}°N ${lon}°E`;
      searchInput.value = '';
      closeDropdown();
      map.setView([lat, lon], 9);
      mainMarker.setLatLng([lat, lon]);
      fetchAll();
    });
    searchDropdown.appendChild(el);
  });
  searchDropdown.classList.add('open');
}

function closeDropdown() {
  searchDropdown.classList.remove('open');
  searchDropdown.innerHTML = '';
}

// ═══════════════════════════════════════
//  Route search helper
// ═══════════════════════════════════════
function setupRouteSearch(inputId, dropdownId, spinnerId, onSelect) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  const spinner  = document.getElementById(spinnerId);
  let timer = null;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { dropdown.classList.remove('open'); dropdown.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      spinner.classList.add('show');
      try {
        const res     = await fetch(`${API.nominatim}/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=se&addressdetails=1&accept-language=sv`);
        const results = await res.json();
        dropdown.innerHTML = '';
        if (!results.length) {
          dropdown.innerHTML = '<div class="search-empty">Inga resultat</div>';
        } else {
          results.forEach(r => {
            const a    = r.address || {};
            const name = a.city || a.town || a.village || a.municipality || r.display_name.split(',')[0];
            const sub  = [a.county, a.state].filter(Boolean).join(', ') || r.type;
            const el   = document.createElement('div');
            el.className = 'search-result';
            // XSS fix: build with textContent instead of innerHTML
            const nameDiv = document.createElement('div');
            nameDiv.className   = 'search-result-name';
            nameDiv.textContent = name;
            const subDiv = document.createElement('div');
            subDiv.className   = 'search-result-sub';
            subDiv.textContent = sub;
            el.appendChild(nameDiv);
            el.appendChild(subDiv);
            el.addEventListener('click', () => {
              input.value = sub ? `${name}, ${sub}` : name;
              dropdown.classList.remove('open');
              dropdown.innerHTML = '';
              onSelect({lat: parseFloat(r.lat), lon: parseFloat(r.lon), label: input.value});
            });
            dropdown.appendChild(el);
          });
        }
        dropdown.classList.add('open');
      } catch (_) {
        dropdown.innerHTML = '<div class="search-empty">Sökning misslyckades</div>';
        dropdown.classList.add('open');
      } finally {
        spinner.classList.remove('show');
      }
    }, SEARCH_DEBOUNCE_MS);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { dropdown.classList.remove('open'); input.blur(); }
  });
}
