// ═══════════════════════════════════════
//  Time slider
// ═══════════════════════════════════════
const slider = document.getElementById('timeSlider');

slider.addEventListener('input', () => {
  currentIdx = +slider.value;
  slider.style.setProperty('--fill', (currentIdx / +slider.max * 100) + '%');
  renderFrame(currentIdx);
  updateAllCityMarkers(currentIdx);
  updateRouteMarkersAt(currentIdx);
});

// Chart parameter tabs
document.querySelectorAll('.chart-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeParam = btn.dataset.param;
    renderChart(currentIdx);
  });
});

// ═══════════════════════════════════════
//  Fetch everything
// ═══════════════════════════════════════
async function fetchAll() {
  document.getElementById('loaderText').textContent = `Hämtar data för ${locationLabel}…`;
  document.getElementById('loader').classList.remove('gone');
  document.getElementById('wxOverlay').classList.add('loading');
  try {
    await fetchMainWeather();
    loadNearbyCities(); // async, no await — loads in background
  } catch (e) {
    console.error(e);
    document.getElementById('wxCond').textContent = 'Kunde inte hämta data';
  } finally {
    document.getElementById('loader').classList.add('gone');
    document.getElementById('wxOverlay').classList.remove('loading');
    positionWxOverlay();
  }
}

// ═══════════════════════════════════════
//  Theme toggle
// ═══════════════════════════════════════
const themeBtn  = document.getElementById('themeBtn');
const themeIcon = document.getElementById('themeIcon');

const SUN_SVG  = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
const MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

let isLight = localStorage.getItem('theme') === 'light';

function applyTheme() {
  document.documentElement.classList.toggle('light', isLight);
  themeIcon.innerHTML = isLight ? SUN_SVG : MOON_SVG;
  tileLayer.setUrl(isLight ? TILES.light : TILES.dark);
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

themeBtn.addEventListener('click', () => {
  isLight = !isLight;
  applyTheme();
});

applyTheme(); // apply saved preference on load

// ═══════════════════════════════════════
//  Geolocation
// ═══════════════════════════════════════
const locateBtn = document.getElementById('locateBtn');

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Din webbläsare stödjer inte positionering.');
    return;
  }
  locateBtn.classList.add('loading');
  locateBtn.querySelector('span') && (locateBtn.querySelector('span').textContent = 'Letar…');

  navigator.geolocation.getCurrentPosition(
    pos => {
      lat = Math.round(pos.coords.latitude  * 1e4) / 1e4;
      lon = Math.round(pos.coords.longitude * 1e4) / 1e4;
      locateBtn.classList.remove('loading');
      map.setView([lat, lon], 10);
      mainMarker.setLatLng([lat, lon]);
      reverseGeocode(lat, lon);
      fetchAll();
    },
    err => {
      locateBtn.classList.remove('loading');
      const msgs = {
        1: 'Åtkomst till position nekad.',
        2: 'Kunde inte hämta position.',
        3: 'Timeout vid positionering.',
      };
      alert(msgs[err.code] || 'Positionering misslyckades.');
    },
    {timeout: 10000, maximumAge: 60000, enableHighAccuracy: true}
  );
});

// ═══════════════════════════════════════
//  Resizable panel
// ═══════════════════════════════════════
const panelColEl     = document.querySelector('.panel-col');
const resizeHandleEl = document.getElementById('resizeHandle');
const PANEL_MIN = 280, PANEL_MAX = 620;
let isResizing = false;

const savedPanelWidth = localStorage.getItem('panelWidth');
if (savedPanelWidth) panelColEl.style.width = savedPanelWidth + 'px';

resizeHandleEl.addEventListener('mousedown', e => {
  isResizing = true;
  resizeHandleEl.classList.add('dragging');
  document.body.style.cursor     = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

window.addEventListener('mousemove', e => {
  if (!isResizing) return;
  const w = Math.min(PANEL_MAX, Math.max(PANEL_MIN, e.clientX));
  panelColEl.style.width = w + 'px';
  renderChart(currentIdx);
});

window.addEventListener('mouseup', () => {
  if (!isResizing) return;
  isResizing = false;
  resizeHandleEl.classList.remove('dragging');
  document.body.style.cursor     = '';
  document.body.style.userSelect = '';
  localStorage.setItem('panelWidth', parseInt(panelColEl.style.width));
});

// ── Debounced resize ─────────────────────────────────────────────────────────
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderChart(currentIdx), RESIZE_DEBOUNCE_MS);
});

// ═══════════════════════════════════════
//  Init
// ═══════════════════════════════════════
fetchAll();
setInterval(() => {
  fetchMainWeather().catch(console.error);
  loadNearbyCities();
}, AUTO_REFRESH_MS);
