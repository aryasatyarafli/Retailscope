const tombol = document.querySelectorAll('.btn-hero');

tombol.forEach(function(btn) {
  btn.addEventListener('mouseover', function() {
    btn.style.background = '#5f5f5f';
    btn.style.color = '#fff';
  });

  btn.addEventListener('mouseout', function() {
    btn.style.background = '#ff751f';
  });
});

var DATA_URL = "Retail_Tangerang_Selatan_2025.geojson";

  var map = L.map('map').setView([-6.2971, 106.7060], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var dotIcon = L.circleMarker;

  fetch(DATA_URL)
    .then(function(res) { return res.json(); })
    .then(function(geojson) {
      L.geoJSON(geojson, {
        pointToLayer: function(feature, latlng) {
          return L.circleMarker(latlng, {
            radius: 6,
            fillColor: '#22c55e',
            color: '#15803d',
            weight: 1,
            fillOpacity: 0.85
          });
        },
        onEachFeature: function(feature, layer) {
          var props = feature.properties;
          var info = '';
          for (var key in props) {
            info += '<b>' + key + ':</b> ' + props[key] + '<br>';
          }
          layer.bindPopup(info);
        }
      }).addTo(map);
    })
    .catch(function(err) {
      console.error('Gagal load GeoJSON:', err);
    });

const tombol2 = document.querySelectorAll('.btn-map');

tombol2.forEach(function(btn2) {
  btn2.addEventListener('mouseover', function() {
    btn2.style.background = '#5f5f5f';
    btn2.style.color = '#fff';
  });

  btn2.addEventListener('mouseout', function() {
    btn2.style.background = '#ff751f';
  });
});



