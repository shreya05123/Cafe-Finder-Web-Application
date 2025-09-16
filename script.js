// Initialize Map
const map = L.map("map").setView([12.9716, 77.5946], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// Search a place using Nominatim
async function searchPlace(place) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${place}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.length > 0) {
    return { lat: data[0].lat, lon: data[0].lon };
  } else {
    alert("Place not found!");
    return null;
  }
}

// Fetch cafés from Overpass API
async function getCafes(lat, lon) {
  const query = `
    [out:json];
    node(around:1500,${lat},${lon})[amenity=cafe];
    out;
  `;
  const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);
  const res = await fetch(url);
  const data = await res.json();
  return data.elements.map(cafe => ({
    name: cafe.tags.name || "Unnamed Café",
    lat: cafe.lat,
    lon: cafe.lon,
    rating: cafe.tags.rating || "N/A",
    photo: "https://via.placeholder.com/250x150?text=Cafe"
  }));
}

// Calculate distance between two coordinates (in km)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2); // distance in km
}

async function findCafes() {
  const place = document.getElementById("placeInput").value;
  if (!place) {
    alert("Enter a location first!");
    return;
  }

  const location = await searchPlace(place);
  if (!location) return;

  map.setView([location.lat, location.lon], 15);
  const cafes = await getCafes(location.lat, location.lon);

  // Pass user location to displayCards
  displayCards(cafes, location);

  cafes.forEach(cafe => {
    L.marker([cafe.lat, cafe.lon])
      .addTo(map)
      .bindPopup(`<b>${cafe.name}</b>`);
  });
}

function displayCards(cafes, userLocation) {
  const container = document.querySelector(".cards");
  container.innerHTML = "";

  cafes.forEach((cafe, i) => {
    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper";
    wrapper.style.zIndex = 200 - i;

    const card = document.createElement("div");
    card.className = "location-card";

    // Calculate distance
    const distance = getDistance(userLocation.lat, userLocation.lon, cafe.lat, cafe.lon);

    card.innerHTML = `
      <img src="${cafe.photo}" alt="${cafe.name}" />
      <h3>${cafe.name}</h3>
      <p>⭐️ Rating: ${cafe.rating}</p>
      <p>📍 ${distance} km away</p>
      <button onclick="window.open(
        'https://www.google.com/maps/dir/?api=1&destination=${cafe.lat},${cafe.lon}',
        '_blank'
      )">Get Directions</button>
      <p><small>Swipe right to save 💖</small></p>
    `;

    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // Swipe detection
    const hammertime = new Hammer(wrapper);
    hammertime.on("swipeleft", () => {
      wrapper.style.transform = "translateX(-150%) rotate(-15deg)";
      wrapper.style.opacity = 0;
      setTimeout(() => wrapper.remove(), 100);
    });
    hammertime.on("swiperight", () => {
      saveCafe(JSON.stringify(cafe));
      wrapper.style.transform = "translateX(150%) rotate(15deg)";
      wrapper.style.opacity = 0;
      setTimeout(() => wrapper.remove(), 100);
    });
  });
}


// Save cafes to localStorage
function saveCafe(cafeJSON) {
  const cafe = JSON.parse(cafeJSON);
  let saved = JSON.parse(localStorage.getItem("savedCafes") || "[]");

  if (!saved.find(c => c.name === cafe.name)) {
    saved.push(cafe);
    localStorage.setItem("savedCafes", JSON.stringify(saved));
    alert(`${cafe.name} saved!`);
  } else {
    alert(`${cafe.name} is already saved.`);
  }
}

// Show saved cafes
function showSaved() {
  const container = document.querySelector(".cards");
  container.innerHTML = "";

  const saved = JSON.parse(localStorage.getItem("savedCafes") || "[]");
  if (saved.length === 0) {
    container.innerHTML = "<p>No saved cafés yet 😢</p>";
    return;
  }

  saved.forEach(cafe => {
    const card = document.createElement("div");
    card.className = "location-card";
    card.innerHTML = `
      <img src="${cafe.photo}" alt="${cafe.name}" />
      <h3>${cafe.name}</h3>
      <p>⭐️ Rating: ${cafe.rating}</p>
    `;
    container.appendChild(card);
  });
}
