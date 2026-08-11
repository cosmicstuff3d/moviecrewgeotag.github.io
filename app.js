document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize MapLibre GL with 3D Globe Projection
  const map = new maplibregl.Map({
    container: "map",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: [0, 20],
    zoom: 1.5,
    pitch: 35,
    projection: "globe"
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  // 2. Fetch the crew JSON dataset
  fetch("crew_data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Could not load crew_data.json.");
      }
      return response.json();
    })
    .then((data) => {
      document.getElementById("movie-title").innerText = data.movie;
      renderCreditsAndMarkers(data.crew, map);
    })
    .catch((err) => {
      console.error("Data error:", err);
      document.getElementById("movie-title").innerText = "Error loading data";
    });
});

function renderCreditsAndMarkers(crewList, map) {
  const creditsListContainer = document.getElementById("credits-list");

  crewList.forEach((person, index) => {
    const [lng, lat] = person.coordinates;

    // Create marker DOM element
    const el = document.createElement("div");
    el.className = "custom-marker";

    // Build Pop-up instance for when the marker pin is clicked
    const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
      <div style="font-family: sans-serif;">
        <strong style="color: #66fcf1; font-size: 1rem;">${person.name}</strong><br/>
        <span style="color: #ddd; font-size: 0.8rem;">${person.role}</span><br/>
        <span style="color: #e62429; font-size: 0.8rem;">📍 ${person.locationName}</span>
      </div>
    `);

    // Attach Marker and Popup to map
    const marker = new maplibregl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

    // Create the compact credit card DOM element
    const card = document.createElement("div");
    card.className = "credit-card";
    card.dataset.index = index;
    card.dataset.lng = lng;
    card.dataset.lat = lat;

    card.innerHTML = `
      <div class="role">${person.role}</div>
      <div class="name">${person.name}</div>
      <div class="location">📍 ${person.locationName}</div>
    `;

    // Click on a credit card directly to open popup and fly map to location
    card.addEventListener("click", () => {
      map.flyTo({
        center: [lng, lat],
        zoom: 5.5,
        pitch: 50,
        speed: 1.0,
        essential: true
      });
      marker.togglePopup();
    });

    creditsListContainer.appendChild(card);
  });

  setupScrollObserver(map);
}

function setupScrollObserver(map) {
  const cards = document.querySelectorAll(".credit-card");
  const creditsPanel = document.getElementById("credits-panel");

  const observerOptions = {
    root: creditsPanel,
    threshold: 0.4 // Adjusted for smaller compact card heights
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        cards.forEach((c) => c.classList.remove("active"));
        entry.target.classList.add("active");

        const lng = parseFloat(entry.target.dataset.lng);
        const lat = parseFloat(entry.target.dataset.lat);

        map.flyTo({
          center: [lng, lat],
          zoom: 5.5,
          pitch: 50,
          bearing: Math.random() * 30 - 15,
          speed: 0.9,
          curve: 1.2,
          essential: true
        });
      }
    });
  }, observerOptions);

  cards.forEach((card) => observer.observe(card));
}
