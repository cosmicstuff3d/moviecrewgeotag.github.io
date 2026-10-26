document.addEventListener("DOMContentLoaded", () => {
  let currentTheme = "dark";
  let activePopup = null;

  // 1. Initialize MapLibre GL with 3D Globe Projection
  const darkStyle = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  const lightStyle = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

  const map = new maplibregl.Map({
    container: "map",
    style: darkStyle,
    center: [0, 20],
    zoom: 1.5,
    pitch: 35,
    projection: "globe"
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  // 2. Theme Toggle Logic
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  themeToggleBtn.addEventListener("click", () => {
    if (currentTheme === "dark") {
      currentTheme = "light";
      document.body.classList.add("light-mode");
      themeToggleBtn.innerText = "🌙 Dark Mode";
      map.setStyle(lightStyle);
    } else {
      currentTheme = "dark";
      document.body.classList.remove("light-mode");
      themeToggleBtn.innerText = "☀️ Light Mode";
      map.setStyle(darkStyle);
    }
  });

  // 3. Fetch crew JSON dataset
  fetch("crew_data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Could not load crew_data.json.");
      }
      return response.json();
    })
    .then((data) => {
      document.getElementById("movie-title").innerText = data.movie;
      renderCreditsAndMarkers(data.crew, map, () => activePopup, (p) => { activePopup = p; });
    })
    .catch((err) => {
      console.error("Data error:", err);
      document.getElementById("movie-title").innerText = "Error loading data";
    });

  // 4. Mobile Swipe-Up / Tap Expand Drawer Logic
  setupMobileDrawer();
});

function renderCreditsAndMarkers(crewList, map, getActivePopup, setActivePopup) {
  const creditsListContainer = document.getElementById("credits-list");

  crewList.forEach((person, index) => {
    const [lng, lat] = person.coordinates;

    const el = document.createElement("div");
    el.className = "custom-marker";

    // Popup instance (ensures previous popup is removed before opening a new one)
    const popup = new maplibregl.Popup({ offset: 15, closeButton: true }).setHTML(`
      <div style="font-family: sans-serif;">
        <strong style="color: #66fcf1; font-size: 1rem;">${person.name}</strong><br/>
        <span style="color: var(--text-color); font-size: 0.8rem;">${person.role}</span><br/>
        <span style="color: #e62429; font-size: 0.8rem;">📍 ${person.locationName}</span>
      </div>
    `);

    const marker = new maplibregl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

    // Marker click event to handle single active popup
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const currentActive = getActivePopup();
      if (currentActive && currentActive !== popup) {
        currentActive.remove();
      }
      popup.addTo(map);
      setActivePopup(popup);
    });

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

    // Card click event
    card.addEventListener("click", () => {
      const currentActive = getActivePopup();
      if (currentActive) {
        currentActive.remove();
      }

      map.flyTo({
        center: [lng, lat],
        zoom: 5.5,
        pitch: 50,
        speed: 1.0,
        essential: true
      });

      popup.addTo(map);
      setActivePopup(popup);
    });

    creditsListContainer.appendChild(card);
  });

  setupScrollObserver(map, getActivePopup, setActivePopup);
}

function setupScrollObserver(map, getActivePopup, setActivePopup) {
  const cards = document.querySelectorAll(".credit-card");
  const creditsPanel = document.getElementById("credits-panel");

  const observerOptions = {
    root: creditsPanel,
    threshold: 0.4
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

function setupMobileDrawer() {
  const creditsPanel = document.getElementById("credits-panel");
  const drawerHandle = document.getElementById("drawer-handle");
  const drawerLabel = document.getElementById("drawer-label");

  if (!drawerHandle) return;

  let isExpanded = false;

  // Tap toggle
  drawerHandle.addEventListener("click", () => {
    isExpanded = !isExpanded;
    creditsPanel.classList.toggle("expanded", isExpanded);
    drawerLabel.innerText = isExpanded ? "Swipe Down to Minimize" : "Swipe Up for Full List";
  });

  // Touch Swipe Gesture detection
  let touchStartY = 0;
  let touchEndY = 0;

  creditsPanel.addEventListener("touchstart", (e) => {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  creditsPanel.addEventListener("touchend", (e) => {
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50;
    if (touchStartY - touchEndY > swipeThreshold && !isExpanded) {
      // Swiped Up -> Expand
      isExpanded = true;
      creditsPanel.classList.add("expanded");
      drawerLabel.innerText = "Swipe Down to Minimize";
    } else if (touchEndY - touchStartY > swipeThreshold && isExpanded) {
      // Swiped Down -> Minimize
      isExpanded = false;
      creditsPanel.classList.remove("expanded");
      drawerLabel.innerText = "Swipe Up for Full List";
    }
  }
}
