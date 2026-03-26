// ═══════════════════════════════════════
//  Weather helpers
// ═══════════════════════════════════════

function getP(params, name) {
  const p = params.find(x => x.name === name);
  return p ? p.values[0] : null;
}

function compass(deg) { return WIND_DIRS[Math.round(deg / 22.5) % 16]; }

function weatherIcon(pcat, tcc, t) {
  if (pcat === 1 || pcat === 2) return '❄️';
  if (pcat === 3) return '🌧️';
  if (pcat === 4) return '🌦️';
  if (pcat === 5 || pcat === 6) return '🧊';
  if (tcc <= 1) return t > 10 ? '☀️' : '🌤️';
  if (tcc <= 4) return '⛅';
  return '☁️';
}

function weatherText(pcat, tcc, t) {
  if (pcat === 1) return 'Snöfall';
  if (pcat === 2) return 'Snöblandat regn';
  if (pcat === 3) return 'Regn';
  if (pcat === 4) return 'Duggregn';
  if (pcat === 5) return 'Frysande regn';
  if (pcat === 6) return 'Frysande dugg';
  if (tcc <= 1) return t > 15 ? 'Klart och varmt' : 'Klart';
  if (tcc <= 3) return 'Lätt molnighet';
  if (tcc <= 5) return 'Halvklart';
  return 'Mulet';
}

function tempClass(t) {
  if (t === null) return '';
  if (t <= 0)  return 'cold';
  if (t <= 10) return 'cool';
  if (t <= 22) return 'warm';
  return 'hot';
}

function windChill(t, ws) {
  if (t >= 10 || ws <= 1.33) return t;
  const v = ws * 3.6;
  return 13.12 + 0.6215*t - 11.37*Math.pow(v,0.16) + 0.3965*t*Math.pow(v,0.16);
}

function fmtDate(d) {
  return d.toLocaleDateString('sv-SE', {weekday:'short', month:'short', day:'numeric'});
}

function fmtTime(d) {
  return d.toLocaleTimeString('sv-SE', {hour:'2-digit', minute:'2-digit'});
}

// ── Chart metadata ───────────────────────────────────────────────────────────
const PARAM_META = {
  t:   {label:'°C',  color:'#2dd4bf', rgb:'45,212,191'},
  ws:  {label:'m/s', color:'#fbbf24', rgb:'251,191,36'},
  msl: {label:'hPa', color:'#818cf8', rgb:'129,140,248'},
  r:   {label:'%',   color:'#67e8f9', rgb:'103,232,249'},
};

// ── renderFrame ──────────────────────────────────────────────────────────────
function renderFrame(idx) {
  if (!allSeries.length) return;
  idx = Math.min(idx, allSeries.length - 1);
  const item = allSeries[idx];
  const p = item.parameters;
  const d = new Date(item.validTime);

  document.getElementById('timeDisplay').textContent = fmtDate(d) + ' · ' + fmtTime(d);
  const badge = document.getElementById('timeBadge');
  if (idx === 0) {
    badge.textContent = 'Nu'; badge.className = 'time-badge';
  } else {
    const days = Math.floor(idx / 24), remH = idx % 24;
    badge.textContent = '+' + (days > 0 ? days + 'd ' : '') + remH + 'h';
    badge.className = 'time-badge future';
  }

  const t     = getP(p, 't');
  const ws    = getP(p, 'ws');
  const wd    = getP(p, 'wd');
  const msl   = getP(p, 'msl');
  const r     = getP(p, 'r');
  const vis   = getP(p, 'vis');
  const tcc   = getP(p, 'tcc_mean');
  const pcat  = getP(p, 'pcat');
  const pmean = getP(p, 'pmean');

  document.getElementById('wxOverlayName').textContent = locationLabel || '–';
  const tempEl = document.getElementById('wxTemp');
  tempEl.textContent = t !== null ? t.toFixed(1) + '°' : '–';
  tempEl.className = 'wx-temp ' + tempClass(t);

  const fl = (t !== null && ws !== null) ? windChill(t, ws) : t;
  document.getElementById('wxFeels').textContent = fl !== null ? fl.toFixed(1) : '–';
  document.getElementById('wxIcon').textContent  = weatherIcon(pcat, tcc, t);
  document.getElementById('wxCond').textContent  = weatherText(pcat, tcc, t);

  document.getElementById('wxWind').textContent     = ws !== null ? ws.toFixed(1) : '–';
  document.getElementById('wxDir').textContent      = wd !== null ? compass(wd) : '';
  document.getElementById('wxPressure').textContent = msl !== null ? Math.round(msl) : '–';
  document.getElementById('wxHumidity').textContent = r !== null ? Math.round(r) : '–';
  document.getElementById('wxVis').textContent      = vis !== null ? (vis/1000).toFixed(1) : '–';
  document.getElementById('wxPrecip').textContent   = pmean !== null ? pmean.toFixed(1) : '0.0';
  document.getElementById('wxPrecipType').textContent = PRECIP_NAMES[pcat] || 'Ingen';
  document.getElementById('wxCloud').textContent    = tcc !== null ? Math.round(tcc) : '–';

  const alertEl = document.getElementById('wxAlert');
  if (ws > 14) {
    alertEl.textContent = `⚠ Stormvarning · ${ws.toFixed(1)} m/s`;
    alertEl.classList.add('show');
  } else if (pmean > 5) {
    alertEl.textContent = `⚠ Kraftig nederbörd · ${pmean.toFixed(1)} mm/tim`;
    alertEl.classList.add('show');
  } else {
    alertEl.classList.remove('show');
  }

  renderChart(idx);
  renderForecast(idx);
}

// ── renderChart ──────────────────────────────────────────────────────────────
function renderChart(startIdx) {
  const c = document.getElementById('mainChart');
  const cx = c.getContext('2d');
  const W = c.offsetWidth, H = 120;
  c.width = W * devicePixelRatio;
  c.height = H * devicePixelRatio;
  c.style.height = H + 'px';
  cx.scale(devicePixelRatio, devicePixelRatio);

  const slice = allSeries.slice(startIdx, Math.min(startIdx + 24, allSeries.length));
  const vals  = slice.map(s => getP(s.parameters, activeParam) ?? 0);
  const labels = slice.map(s => new Date(s.validTime).getHours().toString().padStart(2,'0'));
  const meta  = PARAM_META[activeParam];
  const isMsl = activeParam === 'msl';
  const pad   = {top:14, bottom:24, left:34, right:10};
  const w = W - pad.left - pad.right, h = H - pad.top - pad.bottom;
  const minV  = Math.min(...vals) - (isMsl ? 2 : 1);
  const maxV  = Math.max(...vals) + (isMsl ? 2 : 1);
  const range = maxV - minV || 1;

  cx.clearRect(0, 0, W, H);

  cx.strokeStyle = 'rgba(56,148,198,0.08)';
  cx.lineWidth   = 1;
  cx.fillStyle   = 'rgba(180,206,222,0.72)';
  cx.font        = '9px Inter, sans-serif';
  cx.textAlign   = 'right';
  for (let i = 0; i <= 3; i++) {
    const y = pad.top + (h/3)*i;
    cx.beginPath(); cx.moveTo(pad.left, y); cx.lineTo(W - pad.right, y); cx.stroke();
    cx.fillText((maxV - (range/3)*i).toFixed(isMsl ? 0 : 1), pad.left - 3, y + 3);
  }

  if (vals.length < 2) return;

  const px = i => pad.left + (w/(vals.length-1))*i;
  const py = v => pad.top + h - ((v-minV)/range)*h;

  const grad = cx.createLinearGradient(0, pad.top, 0, H);
  grad.addColorStop(0, `rgba(${meta.rgb},0.16)`);
  grad.addColorStop(1, `rgba(${meta.rgb},0)`);
  cx.beginPath();
  vals.forEach((v,i) => i === 0 ? cx.moveTo(px(i),py(v)) : cx.lineTo(px(i),py(v)));
  cx.lineTo(px(vals.length-1), pad.top+h);
  cx.lineTo(px(0), pad.top+h);
  cx.closePath();
  cx.fillStyle = grad; cx.fill();

  cx.beginPath();
  vals.forEach((v,i) => i === 0 ? cx.moveTo(px(i),py(v)) : cx.lineTo(px(i),py(v)));
  cx.strokeStyle = meta.color;
  cx.lineWidth   = 1.8;
  cx.lineJoin    = 'round';
  cx.stroke();

  cx.fillStyle  = 'rgba(180,206,222,0.72)';
  cx.textAlign  = 'center';
  vals.forEach((_,i) => { if (i%4===0) cx.fillText(labels[i]+'h', px(i), H-5); });

  cx.beginPath(); cx.arc(px(0), py(vals[0]), 3.5, 0, Math.PI*2);
  cx.fillStyle   = meta.color; cx.fill();
  cx.strokeStyle = '#08152100'; cx.lineWidth = 0; cx.stroke();
}

// ── renderForecast ───────────────────────────────────────────────────────────
function renderForecast(startIdx) {
  const strip = document.getElementById('forecastStrip');
  strip.innerHTML = '';
  const end = Math.min(startIdx + 36, allSeries.length);
  for (let i = startIdx; i < end; i++) {
    const s = allSeries[i];
    const p = s.parameters;
    const d = new Date(s.validTime);
    const t    = getP(p, 't');
    const ws   = getP(p, 'ws');
    const pcat = getP(p, 'pcat');
    const tcc  = getP(p, 'tcc_mean');
    const el   = document.createElement('div');
    el.className = 'fcast-row' + (i === startIdx ? ' current' : '');
    el.innerHTML = `
      <div class="fcast-time">${d.getHours().toString().padStart(2,'0')}:00<br><span style="font-size:9px;color:var(--muted2)">${d.toLocaleDateString('sv-SE',{weekday:'short'})}</span></div>
      <div class="fcast-icon">${weatherIcon(pcat, tcc, t)}</div>
      <div class="fcast-desc">${weatherText(pcat, tcc, t)}</div>
      <div class="fcast-temp ${tempClass(t)}">${t !== null ? t.toFixed(1) : '–'}°</div>
      <div class="fcast-wind">${ws !== null ? ws.toFixed(1) : '–'} m/s</div>
    `;
    strip.appendChild(el);
  }
}

// ── fetchMainWeather ─────────────────────────────────────────────────────────
async function fetchMainWeather() {
  const url = `${API.smhi}/lon/${lon}/lat/${lat}/data.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  allSeries  = data.timeSeries;
  currentIdx = 0;
  const slider = document.getElementById('timeSlider');
  slider.max   = allSeries.length - 1;
  slider.value = 0;
  slider.style.setProperty('--fill', '0%');
  renderFrame(0);
}
