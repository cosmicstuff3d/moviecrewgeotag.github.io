document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize MapLibre GL with 3D Globe Projection
  const map = new maplibregl.Map({
    container: "map",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", // Dark Globe Style
    center: [0, 20],
    zoom: 1.5,
    pitch: 35,
    projection: "globe" // Render as a 3D spinning globe
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  // 2. Fetch the crew JSON dataset
  fetch("crew_data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Could not load crew_data.json yet.");
      }
      return response.json();
    })
    .then((data) => {
      document.getElementById("movie-title").innerText = data.movie;
      renderCreditsAndMarkers(data.crew, map);
    })
    .catch((err) => {
      console.error("Data error:", err);
      document.getElementById("movie-title").innerText = "Waiting for crew_data.json...";
    });
});

function renderCreditsAndMarkers(crewList, map) {
  const creditsListContainer = document.getElementById("credits-list");

  crewList.forEach((person, index) => {
    const [lng, lat] = person.coordinates;

    // Create a physical pin marker on the globe for this person
    const el = document.createElement("div");
    el.className = "custom-marker";
    
    new maplibregl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
          `<strong>${person.name}</strong><br/>${person.role}<br/>📍 ${person.locationName}`
        )
      )
      .addTo(map);

    // Create the credit DOM card for the scrolling left panel
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

    creditsListContainer.appendChild(card);
  });

  // 3. Attach IntersectionObserver to handle smooth flyTo actions
  setupScrollObserver(map);
}

function setupScrollObserver(map) {
  const cards = document.querySelectorAll(".credit-card");
  const creditsPanel = document.getElementById("credits-panel");

  const observerOptions = {
    root: creditsPanel,
    threshold: 0.6 // Triggers when 60% of the credit card is visible
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Highlight current card
        cards.forEach((c) => c.classList.remove("active"));
        entry.target.classList.add("active");

        const lng = parseFloat(entry.target.dataset.lng);
        const lat = parseFloat(entry.target.dataset.lat);

        // Smooth camera flight transition across the globe
        map.flyTo({
          center: [lng, lat],
          zoom: 5.5,
          pitch: 50,
          bearing: Math.random() * 30 - 15, // Subtle camera tilt variation
          speed: 0.9,
          curve: 1.2,
          essential: true
        });
      }
    });
  }, observerOptions);

  cards.forEach((card) => observer.observe(card));
}
