const MAPTILER_KEY = 'x5KCN17SNpFbaEWRgG7t';

const STYLES = {
  street:    `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
  satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
  dark:      `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
};

// KLASIFIKASI RETAIL berdasarkan TIPE_2
const KATEGORI = {
  'Daily Needs': {
    color: '#22c55e',
    types: [
      'MINIMARKET', 'SUPERMARKET', 'TOKO KELONTONG', 'TOKO MAKANAN DAN MINUMAN'
    ]
  },
  'Fashion & Beauty': {
    color: '#a855f7',
    types: [
      'TOKO PAKAIAN', 'TOKO KOSMETIK DAN KECANTIKAN', 'TOKO KOSTUM DAN ALAT PESTA',
      'TOKO SEPATU DAN TAS', 'TOKO PERHIASAN DAN AKSESORIS'
    ]
  },
  'Home & Living': {
    color: '#3b82f6',
    types: [
      'TOKO BAHAN BANGUNAN', 'TOKO ELEKTRONIK', 'TOKO OTOMOTIF',
      'TOKO PERALATAN OUTDOOR', 'TOKO PERALATAN MUSIK',
      'TOKO PERALATAN RUMAH TANGGA', 'TOKO PERLENGKAPAN TEKNOLOGI DAN GADGET'
    ]
  },
  'Specialty': {
    color: '#f59e0b',
    types: [
      'TOKO ALAT TULIS DAN BUKU', 'TOKO MAINAN', 'TOKO HEWAN PELIHARAAN',
      'TOKO BUNGA DAN TANAMAN', 'TOKO OPTIK',
      'TOKO PERLENGKAPAN OLAHRAGA'
    ]
  }
};

// State filter aktif
var activeFilters = new Set(Object.keys(KATEGORI));

// Fungsi mapping TIPE_2 ke kategori
function getKategori(tipe2) {
  for (const [kat, val] of Object.entries(KATEGORI)) {
    if (val.types.includes(tipe2)) return kat;
  }
  return null;
}

// Warna per TIPE_2 untuk MapLibre expression
function buildColorExpression() {
  const expr = ['match', ['get', 'TIPE_2']];
  for (const [kat, val] of Object.entries(KATEGORI)) {
    for (const type of val.types) {
      expr.push(type, val.color);
    }
  }
  expr.push('#94a3b8'); // default
  return expr;
}

// Filter expression untuk MapLibre berdasarkan kategori aktif
function buildFilterExpression() {
  const activeTypes = [];
  for (const kat of activeFilters) {
    if (KATEGORI[kat]) {
      activeTypes.push(...KATEGORI[kat].types);
    }
  }
  if (activeTypes.length === 0) return ['==', ['get', 'TIPE_2'], ''];
  return ['in', ['get', 'TIPE_2'], ['literal', activeTypes]];
}

const map = new maplibregl.Map({
  container: 'map',
  style: STYLES.street,
  center: [106.7060, -6.2971],
  zoom: 12
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

// BASEMAP
function setBasemap(style, el) {
  map.setStyle(STYLES[style]);
  document.querySelectorAll('.basemap-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  map.once('styledata', () => loadLayers());
}

// TAB SWITCHER
function switchTab(tab, btn) {
  document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
}

// LOAD LAYERS
var halteMarkers = [];
var stasiunMarkers = [];

function clearMarkers(arr) {
  arr.forEach(m => m.remove());
  arr.length = 0;
}

function createPinSVG(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`;
}

function addPinMarkers(features, color, markersArr, popupFn) {
  features.forEach(f => {
    const el = document.createElement('div');
    el.innerHTML = createPinSVG(color);
    el.style.cursor = 'pointer';
    el.style.width = '24px';
    el.style.height = '32px';

    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(f.geometry.coordinates)
      .addTo(map);

    el.addEventListener('click', () => {
      new maplibregl.Popup({ maxWidth: '240px', offset: [0, -28] })
        .setLngLat(f.geometry.coordinates)
        .setHTML(popupFn(f.properties))
        .addTo(map);
    });

    markersArr.push(marker);
  });
}

function loadLayers() {

  // BATAS ADMIN
  fetch('data/Batas_Admin_Tangsel.geojson')
    .then(r => r.json())
    .then(data => {
      if (!map.getSource('batas-admin')) {
        map.addSource('batas-admin', { type: 'geojson', data });
      } else {
        map.getSource('batas-admin').setData(data);
      }
      if (!map.getLayer('batas-admin-fill')) {
        map.addLayer({ id: 'batas-admin-fill', type: 'fill', source: 'batas-admin', paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.08 } });
      }
      if (!map.getLayer('batas-admin-line')) {
        map.addLayer({ id: 'batas-admin-line', type: 'line', source: 'batas-admin', paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-dasharray': [3, 2] } });
      }
    })
    .catch(err => console.warn('Batas Admin tidak ditemukan:', err));

  // JARINGAN JALAN
  fetch('data/Jaringan_Jalan_Tangsel.geojson')
    .then(r => r.json())
    .then(data => {
      if (!map.getSource('jalan')) {
        map.addSource('jalan', { type: 'geojson', data });
      } else {
        map.getSource('jalan').setData(data);
      }
      if (!map.getLayer('jalan-layer')) {
        map.addLayer({
          id: 'jalan-layer',
          type: 'line',
          source: 'jalan',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#475569', 'line-width': 1.5, 'line-opacity': 0.7 }
        });
      }
    })
    .catch(err => console.warn('Jaringan Jalan tidak ditemukan:', err));

  // HALTE
  fetch('data/Halte_Tangsel.geojson')
    .then(r => r.json())
    .then(data => {
      clearMarkers(halteMarkers);
      addPinMarkers(
        data.features,
        '#f97316',
        halteMarkers,
        p => `<div style="font-family:'Plus Jakarta Sans',sans-serif;">
          <div style="font-size:12px;font-weight:700;color:#1a1a2e;margin-bottom:4px;">${p.NAMA || p.nama || p.name || 'Halte'}</div>
          <div style="font-size:10px;color:#f97316;font-weight:600;">🚌 Bus Stop</div>
        </div>`
      );
    })
    .catch(err => console.warn('Halte tidak ditemukan:', err));

  // STASIUN KRL
  fetch('data/Stasiun_Tangsel.geojson')
    .then(r => r.json())
    .then(data => {
      clearMarkers(stasiunMarkers);
      addPinMarkers(
        data.features,
        '#ef4444',
        stasiunMarkers,
        p => `<div style="font-family:'Plus Jakarta Sans',sans-serif;">
          <div style="font-size:12px;font-weight:700;color:#1a1a2e;margin-bottom:4px;">${p.NAMA || p.nama || p.name || 'Stasiun'}</div>
          <div style="font-size:10px;color:#ef4444;font-weight:600;">🚆 KRL Station</div>
        </div>`
      );
    })
    .catch(err => console.warn('Stasiun tidak ditemukan:', err));

  // RETAIL LOCATIONS
  fetch('data/Retail_Tangerang_Selatan_2025.geojson')
    .then(r => r.json())
    .then(data => {
      if (!map.getSource('retail')) {
        map.addSource('retail', { type: 'geojson', data });
      } else {
        map.getSource('retail').setData(data);
      }
      if (!map.getLayer('retail-layer')) {
        map.addLayer({
          id: 'retail-layer',
          type: 'circle',
          source: 'retail',
          filter: buildFilterExpression(),
          paint: {
            'circle-radius': 6,
            'circle-color': buildColorExpression(),
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1
          }
        });
      }

      // POPUP INFO
      map.on('click', 'retail-layer', function(e) {
        const p = e.features[0].properties;
        const kat = getKategori(p.TIPE_2) || 'Other';
        const katColor = KATEGORI[kat] ? KATEGORI[kat].color : '#94a3b8';
        const status = p.STATUS === 'BUKA'
          ? `<span style="color:#22c55e;font-weight:700;">● BUKA</span>`
          : `<span style="color:#ef4444;font-weight:700;">● TUTUP</span>`;

        const html = `
          <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:200px;max-width:260px;">
            <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:4px;">${p.NAMA || '-'}</div>
            <div style="display:inline-block;background:${katColor}22;color:${katColor};font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-bottom:10px;">${p.TIPE_2 || '-'}</div>
            <div style="font-size:11px;color:#6b7280;line-height:1.8;">
              ${p.ALAMAT ? `<div>📍 ${p.ALAMAT}</div>` : ''}
              ${p.TELEPON && p.TELEPON !== '-' ? `<div>📞 ${p.TELEPON}</div>` : ''}
              ${p.KECAMATAN ? `<div>🏘 ${p.KECAMATAN}</div>` : ''}
              <div style="margin-top:6px;">${status}</div>
            </div>
          </div>`;

        new maplibregl.Popup({ maxWidth: '280px', offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });

      map.on('mouseenter', 'retail-layer', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'retail-layer', () => map.getCanvas().style.cursor = '');
    })
    .catch(err => console.warn('Retail GeoJSON tidak ditemukan:', err));
}

map.on('load', loadLayers);

// TOGGLE FILTER KATEGORI
function toggleKategori(kat, checked) {
  if (checked) {
    activeFilters.add(kat);
  } else {
    activeFilters.delete(kat);
  }
  if (map.getLayer('retail-layer')) {
    map.setFilter('retail-layer', buildFilterExpression());
  }
}

// TOGGLE LAYER
function toggleLayer(id, visible) {
  const mapLayers = {
    'retail': ['retail-layer'],
    'batas-admin': ['batas-admin-fill', 'batas-admin-line'],
    'jalan': ['jalan-layer']
  };
  if (mapLayers[id]) {
    mapLayers[id].forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    });
  }
  if (id === 'halte') {
    halteMarkers.forEach(m => m.getElement().style.display = visible ? 'block' : 'none');
  }
  if (id === 'stasiun') {
    stasiunMarkers.forEach(m => m.getElement().style.display = visible ? 'block' : 'none');
  }
}

// SEARCH LOCATION
var searchTimeout = null;
document.getElementById('search-input').addEventListener('input', function() {
  clearTimeout(searchTimeout);
  const query = this.value.trim().toLowerCase();
  const resultsEl = document.getElementById('search-results');

  if (query.length < 2) {
    resultsEl.style.display = 'none';
    return;
  }

  searchTimeout = setTimeout(function() {
    const source = map.getSource('retail');
    if (!source) return;

    // Cari dari features yang sudah di-load
    const features = source._data ? source._data.features : [];
    const kecamatanSet = new Set();
    const desaSet = new Set();

    features.forEach(f => {
      const p = f.properties;
      if (p.KECAMATAN && p.KECAMATAN.toLowerCase().includes(query)) kecamatanSet.add(p.KECAMATAN);
      if (p.DESA && p.DESA.toLowerCase().includes(query)) desaSet.add(p.DESA + '|' + p.KECAMATAN);
    });

    const results = [];
    kecamatanSet.forEach(k => results.push({ label: k, type: 'Kecamatan', value: k, field: 'KECAMATAN' }));
    desaSet.forEach(d => {
      const [desa, kec] = d.split('|');
      results.push({ label: desa, type: 'Kelurahan · ' + kec, value: desa, field: 'DESA' });
    });

    if (results.length === 0) {
      resultsEl.innerHTML = '<div style="padding:10px;font-size:12px;color:#94a3b8;text-align:center;">No results found</div>';
      resultsEl.style.display = 'block';
      return;
    }

    resultsEl.innerHTML = results.slice(0, 8).map(r => `
      <div class="search-result-item" onclick="flyToArea('${r.field}', '${r.value}')">
        <div style="font-size:12px;font-weight:600;color:#1a1a2e;">${r.label}</div>
        <div style="font-size:10px;color:#94a3b8;">${r.type}</div>
      </div>
    `).join('');
    resultsEl.style.display = 'block';
  }, 300);
});

// Tutup hasil search saat klik di luar
document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-wrapper')) {
    document.getElementById('search-results').style.display = 'none';
  }
});

function flyToArea(field, value) {
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('search-input').value = value;

  const source = map.getSource('retail');
  if (!source || !source._data) return;

  const features = source._data.features.filter(f => f.properties[field] === value);
  if (features.length === 0) return;

  // Hitung bounding box dari semua titik yang cocok
  const coords = features.map(f => f.geometry.coordinates);
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const bounds = [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  ];

  map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 });
}

// USER LOCATION
var userLocation = null;
var userMarker = null;

// BUFFER
document.getElementById('input-radius').addEventListener('input', function() {
  document.getElementById('label-radius').innerHTML = parseFloat(this.value).toFixed(2) + ' <span>km</span>';
});

function jalankanBuffer() {
  if (!userLocation) {
    alert('Drop your location first before running the buffer analysis.');
    return;
  }

  const radius = parseFloat(document.getElementById('input-radius').value);
  const point = turf.point([userLocation.lng, userLocation.lat]);
  const buffered = turf.buffer(point, radius, { units: 'kilometers' });

  hapusBuffer();
  map.addSource('buffer-source', { type: 'geojson', data: buffered });
  map.addLayer({ id: 'buffer-layer', type: 'fill', source: 'buffer-source', paint: { 'fill-color': '#ff751f', 'fill-opacity': 0.15 } });
  map.addLayer({ id: 'buffer-outline', type: 'line', source: 'buffer-source', paint: { 'line-color': '#ff751f', 'line-width': 2, 'line-dasharray': [3, 2] } });

  // ANALISIS TITIK DALAM BUFFER
  const source = map.getSource('retail');
  if (!source || !source._data) return;

  const features = source._data.features;
  const within = features.filter(f => turf.booleanPointInPolygon(f, buffered));

  // Hitung per kategori
  const countPerKat = {};
  Object.keys(KATEGORI).forEach(k => countPerKat[k] = 0);
  countPerKat['Other'] = 0;

  within.forEach(f => {
    const kat = getKategori(f.properties.TIPE_2) || 'Other';
    countPerKat[kat] = (countPerKat[kat] || 0) + 1;
  });

  const total = within.length;

  // Klasifikasi peluang per kategori
  // Tinggi (merah >10): area sudah jenuh, persaingan ketat
  // Sedang (kuning 4-10): ada kompetitor tapi masih ada ruang
  // Rendah (hijau <4): underserved, peluang tinggi
  function getOpportunity(count) {
    if (count >= 10) return { label: 'High Competition', color: '#ef4444', bg: '#fef2f2' };
    if (count >= 4)  return { label: 'Moderate',         color: '#f59e0b', bg: '#fffbeb' };
    return                  { label: 'High Opportunity', color: '#22c55e', bg: '#f0fdf4' };
  }

  // Render hasil
  const resultsEl = document.getElementById('buffer-results');

  const katRows = Object.entries(countPerKat)
    .filter(([k]) => k !== 'Other' && KATEGORI[k])
    .map(([k, count]) => {
      const opp = getOpportunity(count);
      const color = KATEGORI[k].color;
      return `
        <div class="buffer-kat-row">
          <div class="buffer-kat-left">
            <div class="buffer-kat-dot" style="background:${color};"></div>
            <span class="buffer-kat-name">${k}</span>
          </div>
          <div class="buffer-kat-right">
            <span class="buffer-kat-count">${count}</span>
            <span class="buffer-opp-badge" style="color:${opp.color};background:${opp.bg};">${opp.label}</span>
          </div>
        </div>`;
    }).join('');

  resultsEl.innerHTML = `
    <div class="buffer-total">
      <span>Total competitors in radius</span>
      <strong>${total}</strong>
    </div>
    <div class="buffer-kat-list">${katRows}</div>
    <div class="buffer-legend">
      <span style="color:#22c55e;">● High Opportunity</span> &lt;4 &nbsp;
      <span style="color:#f59e0b;">● Moderate</span> 4–9 &nbsp;
      <span style="color:#ef4444;">● High Competition</span> ≥10
    </div>`;
  resultsEl.style.display = 'block';
}

function hapusBuffer() {
  if (map.getLayer('buffer-outline')) map.removeLayer('buffer-outline');
  if (map.getLayer('buffer-layer')) map.removeLayer('buffer-layer');
  if (map.getSource('buffer-source')) map.removeSource('buffer-source');
  const resultsEl = document.getElementById('buffer-results');
  if (resultsEl) { resultsEl.innerHTML = ''; resultsEl.style.display = 'none'; }
}

// LOCATION
function setUserLocation(lng, lat) {
  if (userMarker) userMarker.remove();
  userLocation = { lng, lat };
  userMarker = new maplibregl.Marker({ color: '#ff751f' })
    .setLngLat([lng, lat])
    .addTo(map);
  const el = document.getElementById('info-lokasi');
  el.style.display = 'block';
  document.getElementById('teks-lokasi').innerHTML =
    `<b>Lat:</b> ${lat.toFixed(5)}<br><b>Lng:</b> ${lng.toFixed(5)}`;
}

function laporkanLokasi() {
  navigator.geolocation.getCurrentPosition(function(pos) {
    const { latitude, longitude } = pos.coords;
    map.flyTo({ center: [longitude, latitude], zoom: 14 });
    setUserLocation(longitude, latitude);
  }, function() {
    alert('GPS access denied or unavailable.');
  });
}

function aktifkanManual() {
  map.getCanvas().style.cursor = 'crosshair';
  map.once('click', function(e) {
    map.getCanvas().style.cursor = '';
    setUserLocation(e.lngLat.lng, e.lngLat.lat);
  });
}

// TOGGLE FILTER UI (dipanggil dari onclick HTML)
function toggleKategoriUI(el, kat) {
  const checkEl = el.querySelector('.filter-check');
  const isActive = checkEl.classList.contains('active');
  if (isActive) {
    checkEl.classList.remove('active');
    el.classList.add('inactive');
  } else {
    checkEl.classList.add('active');
    el.classList.remove('inactive');
  }
  toggleKategori(kat, !isActive);
}