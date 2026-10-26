document.addEventListener("DOMContentLoaded", () => {
  let currentTheme = "dark";
  let activePopup = null;

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

  setupMobileDrawer();
});

function renderCreditsAndMarkers(crewList, map, getActivePopup, setActivePopup) {
  const creditsListContainer = document.getElementById("credits-list");

  crewList.forEach((person, index) => {
    const [lng, lat] = person.coordinates;

    const el = document.createElement("div");
    el.className = "custom-marker";

    const popup = new maplibregl.Popup({ offset: 15, closeButton: true }).setHTML(`
      <div style="font-family: sans-serif;">
        <div class="popup-name">${person.name}</div>
        <div class="popup-role">${person.role}</div>
        <div class="popup-location">📍 ${person.locationName}</div>
      </div>
    `);

    const marker = new maplibregl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

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

    // Marker Click Event: Open popup, highlight card, scroll to it, and restore drawer if hidden
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const currentActive = getActivePopup();
      if (currentActive && currentActive !== popup) {
        currentActive.remove();
      }
      popup.addTo(map);
      setActivePopup(popup);

      // Highlight corresponding card and scroll smoothly into view
      document.querySelectorAll(".credit-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      card.scrollIntoView({ behavior: "smooth", block: "center" });

      // If mobile drawer was hidden to show full map, bring it back to compact view so user sees details
      const creditsPanel = document.getElementById("credits-panel");
      const restoreBtn = document.getElementById("restore-credits-btn");
      if (creditsPanel.classList.contains("hidden-drawer")) {
        creditsPanel.classList.remove("hidden-drawer");
        if (restoreBtn) restoreBtn.classList.remove("visible");
      }
    });

    // Card Click Event: Fly map to location and open popup
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

  // Create Restore Button dynamically if not in index.html
  let restoreBtn = document.getElementById("restore-credits-btn");
  if (!restoreBtn) {
    restoreBtn = document.createElement("button");
    restoreBtn.id = "restore-credits-btn";
    restoreBtn.innerText = "📜 View Credits";
    document.body.appendChild(restoreBtn);
  }

  let drawerState = "compact"; // options: 'compact', 'expanded', 'hidden'

  // Tap handle logic (Cycles through states)
  drawerHandle.addEventListener("click", () => {
    if (drawerState === "compact") {
      expandDrawer();
    } else {
      collapseDrawer();
    }
  });

  restoreBtn.addEventListener("click", () => {
    restoreDrawer();
  });

  function expandDrawer() {
    drawerState = "expanded";
    creditsPanel.classList.add("expanded");
    creditsPanel.classList.remove("hidden-drawer");
    restoreBtn.classList.remove("visible");
    drawerLabel.innerText = "Swipe Down to Minimize";
  }

  function collapseDrawer() {
    drawerState = "compact";
    creditsPanel.classList.remove("expanded");
    creditsPanel.classList.remove("hidden-drawer");
    restoreBtn.classList.remove("visible");
    drawerLabel.innerText = "Swipe Up for Full List";
  }

  function hideDrawer() {
    drawerState = "hidden";
    creditsPanel.classList.add("hidden-drawer");
    creditsPanel.classList.remove("expanded");
    restoreBtn.classList.add("visible");
  }

  function restoreDrawer() {
    drawerState = "compact";
    creditsPanel.classList.remove("hidden-drawer");
    restoreBtn.classList.remove("visible");
    drawerLabel.innerText = "Swipe Up for Full List";
  }

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
    const diff = touchEndY - touchStartY;

    if (touchStartY - touchEndY > swipeThreshold) {
      // Swiped Up
      if (drawerState === "compact") {
        expandDrawer();
      }
    } else if (diff > swipeThreshold) {
      // Swiped Down
      if (drawerState === "expanded") {
        collapseDrawer();
      } else if (drawerState === "compact") {
        hideDrawer(); // Swipe down from compact hides drawer completely to see map only!
      }
    }
  }
}
