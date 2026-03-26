// ═══════════════════════════════════════
//  Map init
// ═══════════════════════════════════════
const map = L.map('map', {zoomControl: true, attributionControl: true})
  .setView([lat, lon], 8);

setTimeout(() => { map.invalidateSize(); positionWxOverlay(); }, 0);

const TILES = {
  dark:  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};
const TILE_ATTR = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, USGS, NOAA';

let tileLayer = L.tileLayer(TILES.dark, {attribution: TILE_ATTR, maxZoom: 19}).addTo(map);

// ── Main location marker ─────────────────────────────────────────────────────
const mainIcon = L.divIcon({
  html: '<div class="main-marker"><div class="main-marker-ring"></div></div>',
  className: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const mainMarker = L.marker([lat, lon], {icon: mainIcon, draggable: true}).addTo(map);

function positionWxOverlay() {
  const pt = map.latLngToContainerPoint([lat, lon]);
  const overlay = document.getElementById('wxOverlay');
  overlay.style.left = pt.x + 'px';
  overlay.style.top  = pt.y + 'px';
}

map.on('move zoom resize', positionWxOverlay);

mainMarker.on('dragend', () => {
  const p = mainMarker.getLatLng();
  lat = Math.round(p.lat * 1e4) / 1e4;
  lon = Math.round(p.lng * 1e4) / 1e4;
  reverseGeocode(lat, lon);
  fetchAll();
});

map.on('click', e => {
  lat = Math.round(e.latlng.lat * 1e4) / 1e4;
  lon = Math.round(e.latlng.lng * 1e4) / 1e4;
  mainMarker.setLatLng([lat, lon]);
  reverseGeocode(lat, lon);
  fetchAll();
});

// ── City marker layer ────────────────────────────────────────────────────────
let cityLayer   = L.layerGroup().addTo(map);
let cityStore   = {};
let nearbyCities = [];

function dist2(a, b) {
  const dlat = a.lat - b.lat, dlon = a.lon - b.lon;
  return dlat*dlat + dlon*dlon;
}

function findNearbyCities(clat, clon, n = NEARBY_CITIES_COUNT) {
  return CITIES
    .filter(c => !(Math.abs(c.lat - clat) < 0.01 && Math.abs(c.lon - clon) < 0.01))
    .sort((a, b) => dist2(a, {lat:clat,lon:clon}) - dist2(b, {lat:clat,lon:clon}))
    .slice(0, n);
}

function buildCityIcon(city) {
  const id = 'cm-' + city.n.replace(/\s+/g, '_');
  return L.divIcon({
    html: `<div class="city-marker" id="${id}">
      <div class="city-marker-inner">
        <span class="cm-icon">…</span>
        <span class="cm-temp">–</span>
        <div class="cm-name">${city.n}</div>
      </div>
    </div>`,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

async function loadNearbyCities() {
  nearbyCities = findNearbyCities(lat, lon);
  cityLayer.clearLayers();
  cityStore = {};

  nearbyCities.forEach(city => {
    const marker = L.marker([city.lat, city.lon], {icon: buildCityIcon(city)}).addTo(cityLayer);
    marker.on('click', () => {
      lat = city.lat; lon = city.lon;
      locationLabel = city.n;
      document.getElementById('locationName').textContent   = city.n;
      document.getElementById('footerCoords').textContent   = `${lat}°N ${lon}°E`;
      mainMarker.setLatLng([lat, lon]);
      map.setView([lat, lon], map.getZoom());
      fetchAll();
    });
    cityStore[city.n] = { marker, series: null };
  });

  const fetches = nearbyCities.map(async city => {
    try {
      const url = `${API.smhi}/lon/${city.lon}/lat/${city.lat}/data.json`;
      const res  = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      cityStore[city.n].series = data.timeSeries;
      updateCityMarkerAt(city.n, currentIdx);
    } catch (_) {}
  });

  await Promise.allSettled(fetches);
}

function updateCityMarkerAt(name, idx) {
  const store = cityStore[name];
  if (!store || !store.series || !store.series.length) return;
  const safeIdx = Math.min(idx, store.series.length - 1);
  const item = store.series[safeIdx];
  const t    = getP(item.parameters, 't');
  const tcc  = getP(item.parameters, 'tcc_mean');
  const pcat = getP(item.parameters, 'pcat');
  const id   = 'cm-' + name.replace(/\s+/g, '_');
  const el   = document.getElementById(id);
  if (!el) return;
  el.querySelector('.cm-icon').textContent = weatherIcon(pcat, tcc, t);
  const tempEl = el.querySelector('.cm-temp');
  tempEl.textContent = t !== null ? t.toFixed(1) + '°' : '–';
  tempEl.className   = 'cm-temp ' + tempClass(t);
}

function updateAllCityMarkers(idx) {
  nearbyCities.forEach(c => updateCityMarkerAt(c.n, idx));
}
