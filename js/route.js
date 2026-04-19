// ═══════════════════════════════════════
//  Route state
// ═══════════════════════════════════════
let activeView         = 'weather';
let routeFrom          = null;  // {lat, lon, label}
let routeTo            = null;  // {lat, lon, label}
let routeMode          = 'driving';
let routeLayer         = L.layerGroup().addTo(map);
let routeStore         = {};    // key → {series, marker}
let routePoints        = [];    // [{lat, lon, distKm}]
let routePolyline      = null;
let routeTotalDistM    = 0;     // meters
let routeTotalDurS     = 0;     // seconds
let routeDepartureTime = new Date();

// ── View switching ───────────────────────────────────────────────────────────
function switchView(view) {
  activeView = view;
  document.getElementById('weatherPanel').hidden = view !== 'weather';
  document.getElementById('routePanel').hidden   = view !== 'route';
  document.getElementById('weatherActions').style.display = view === 'weather' ? '' : 'none';
  document.getElementById('timeBar').style.display        = view === 'weather' ? '' : 'none';
  document.querySelectorAll('.view-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view));

  if (view === 'weather') {
    routeLayer.clearLayers();
    routeStore  = {};
    routePoints = [];
    if (routePolyline) { routePolyline.remove(); routePolyline = null; }
    document.getElementById('routeSummary').hidden = true;
    if (!map.hasLayer(cityLayer)) cityLayer.addTo(map);
    document.getElementById('wxOverlay').style.display = '';
    if (!map.hasLayer(mainMarker)) mainMarker.addTo(map);
  } else {
    if (map.hasLayer(cityLayer)) cityLayer.remove();
    document.getElementById('wxOverlay').style.display = 'none';
    if (map.hasLayer(mainMarker)) mainMarker.remove();
  }
}

document.querySelectorAll('.view-tab').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ── Transport mode ───────────────────────────────────────────────────────────
document.querySelectorAll('.route-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.route-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    routeMode = btn.dataset.mode;
  });
});

// ── Departure time ───────────────────────────────────────────────────────────
function toDatetimeLocal(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function initDeparturePicker() {
  const inp = document.getElementById('routeDeparture');
  const now = new Date();
  const max = new Date(now.getTime() + 10 * 24 * 3600 * 1000);
  inp.min   = toDatetimeLocal(now);
  inp.max   = toDatetimeLocal(max);
  inp.value = toDatetimeLocal(now);
  routeDepartureTime = now;
}
initDeparturePicker();

document.getElementById('routeDeparture').addEventListener('change', e => {
  routeDepartureTime = e.target.value ? new Date(e.target.value) : new Date();
  renderRouteWeather();
});

// ── Time-aware weather along route ───────────────────────────────────────────
function getArrivalTime(distKm) {
  if (!routeTotalDistM) return routeDepartureTime;
  const fraction   = (distKm * 1000) / routeTotalDistM;
  const durAtPoint = routeTotalDurS * fraction * 1000; // ms
  return new Date(routeDepartureTime.getTime() + durAtPoint);
}

function findSmhiIndex(series, targetTime) {
  const t = targetTime.getTime();
  let bestIdx = 0, bestDiff = Infinity;
  series.forEach((item, i) => {
    const diff = Math.abs(new Date(item.validTime).getTime() - t);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  });
  return bestIdx;
}

function renderRouteWeather() {
  routePoints.forEach((pt, i) => {
    const key   = `rp-${i}`;
    const store = routeStore[key];
    if (!store?.series) return;
    const idx = findSmhiIndex(store.series, getArrivalTime(pt.distKm));
    updateRouteMarkerAt(key, store.series, idx);
  });
}

// ── Route geometry helpers ───────────────────────────────────────────────────
function haversineKm(a, b) {
  const R    = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const s    = Math.sin(dLat/2)**2 +
               Math.cos(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) *
               Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(Math.min(1, s)));
}

function sampleRoutePoints(coords, intervalKm = ROUTE_SAMPLE_KM) {
  const pts = [];
  let accumulated = 0, nextTarget = intervalKm;
  pts.push({lat: coords[0][1], lon: coords[0][0], distKm: 0});
  for (let i = 1; i < coords.length; i++) {
    const prev = {lat: coords[i-1][1], lon: coords[i-1][0]};
    const curr = {lat: coords[i][1],   lon: coords[i][0]};
    const seg  = haversineKm(prev, curr);
    while (accumulated + seg >= nextTarget) {
      const t = (nextTarget - accumulated) / seg;
      pts.push({
        lat:    prev.lat + t * (curr.lat - prev.lat),
        lon:    prev.lon + t * (curr.lon - prev.lon),
        distKm: nextTarget,
      });
      nextTarget += intervalKm;
    }
    accumulated += seg;
  }
  const last = {lat: coords[coords.length-1][1], lon: coords[coords.length-1][0], distKm: accumulated};
  if (haversineKm(pts[pts.length-1], last) > 2) pts.push(last);
  return pts;
}

function updateRouteMarkerAt(key, series, idx) {
  if (!series || !series.length) return;
  const item = series[Math.min(idx, series.length - 1)];
  const t    = getP(item.parameters, 't');
  const tcc  = getP(item.parameters, 'tcc_mean');
  const pcat = getP(item.parameters, 'pcat');
  const el   = document.getElementById(key);
  if (!el) return;
  el.querySelector('.cm-icon').textContent = weatherIcon(pcat, tcc, t);
  const tempEl = el.querySelector('.cm-temp');
  tempEl.textContent = t !== null ? t.toFixed(1) + '°' : '–';
  tempEl.className   = 'cm-temp ' + tempClass(t);
}

function updateRouteMarkersAt(idx) {
  Object.entries(routeStore).forEach(([key, store]) => {
    if (store.series) updateRouteMarkerAt(key, store.series, idx);
  });
}

// ── Route search setup ───────────────────────────────────────────────────────
document.addEventListener('click', e => {
  ['routeFromDropdown','routeToDropdown'].forEach(id => {
    const dd = document.getElementById(id);
    if (dd && !dd.previousElementSibling.contains(e.target)) {
      dd.classList.remove('open');
    }
  });
});

function checkRouteReady() {
  document.getElementById('routeCalcBtn').disabled = !(routeFrom && routeTo);
}

setupRouteSearch('routeFromInput', 'routeFromDropdown', 'routeFromSpinner', loc => {
  routeFrom = loc; checkRouteReady();
});
setupRouteSearch('routeToInput', 'routeToDropdown', 'routeToSpinner', loc => {
  routeTo = loc; checkRouteReady();
});

document.getElementById('routeCalcBtn').addEventListener('click', calculateRoute);

// ── Calculate route ──────────────────────────────────────────────────────────
async function calculateRoute() {
  if (!routeFrom || !routeTo) return;
  const btn = document.getElementById('routeCalcBtn');
  btn.disabled    = true;
  btn.textContent = 'Beräknar…';
  document.getElementById('routeSummary').hidden = true;

  routeLayer.clearLayers();
  routeStore  = {};
  routePoints = [];
  if (routePolyline) { routePolyline.remove(); routePolyline = null; }

  try {
    const url  = `${API.osrm}/${routeMode}/${routeFrom.lon},${routeFrom.lat};${routeTo.lon},${routeTo.lat}?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.routes || !data.routes.length) throw new Error('Ingen rutt hittades');

    const route = data.routes[0];
    const coords = route.geometry.coordinates;
    routeTotalDistM = route.distance;
    routeTotalDurS  = route.duration;
    const distKm    = (route.distance / 1000).toFixed(1);
    const durMin    = Math.round(route.duration / 60);
    const durH      = Math.floor(durMin / 60), durM = durMin % 60;
    const modeLabel = {driving:'Bil', bike:'Cykel', foot:'Gång'}[routeMode];

    const latLngs = coords.map(c => [c[1], c[0]]);
    routePolyline = L.polyline(latLngs, {
      color: '#2dd4bf', weight: 3, opacity: 0.75, dashArray: '8 5'
    }).addTo(routeLayer);
    map.fitBounds(routePolyline.getBounds(), {padding: [40, 40]});

    routePoints = sampleRoutePoints(coords, ROUTE_SAMPLE_KM);
    routePoints.forEach((pt, i) => {
      const key  = `rp-${i}`;
      const icon = L.divIcon({
        html: `<div class="city-marker" id="${key}">
          <div class="city-marker-inner">
            <span class="cm-icon">…</span>
            <span class="cm-temp">–</span>
            <div class="cm-name">${Math.round(pt.distKm)} km</div>
          </div>
        </div>`,
        className: '', iconSize: [0,0], iconAnchor: [0,0],
      });
      const marker = L.marker([pt.lat, pt.lon], {icon}).addTo(routeLayer);
      routeStore[key] = {series: null, marker};
    });

    document.getElementById('routeDistVal').textContent   = distKm + ' km';
    document.getElementById('routeDurVal').textContent    = durH > 0 ? `${durH}h ${durM}min` : `${durM} min`;
    document.getElementById('routeDurLabel').textContent  = `Restid · ${modeLabel}`;
    document.getElementById('routeFromLabel').textContent = routeFrom.label;
    document.getElementById('routeToLabel').textContent   = routeTo.label;
    document.getElementById('routeSummary').hidden = false;

    const fetches = routePoints.map(async (pt, i) => {
      const key = `rp-${i}`;
      try {
        const wxUrl  = `${API.smhi}/lon/${pt.lon.toFixed(4)}/lat/${pt.lat.toFixed(4)}/data.json`;
        const wxRes  = await fetch(wxUrl);
        if (!wxRes.ok) return;
        const wxData = await wxRes.json();
        routeStore[key].series = wxData.timeSeries;
        const idx = findSmhiIndex(wxData.timeSeries, getArrivalTime(pt.distKm));
        updateRouteMarkerAt(key, wxData.timeSeries, idx);
      } catch (e) { console.error('SMHI route fetch failed:', key, e); }
    });
    await Promise.allSettled(fetches);

  } catch (e) {
    console.error(e);
    alert('Kunde inte beräkna rutten: ' + e.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Beräkna rutt';
  }
}
