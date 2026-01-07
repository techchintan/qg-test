function resetSearchUI() {
  const searchInput = document.querySelector(".search-input");
  const allGamesContainer = document.getElementById("gameList");
  const searchResultsContainer = document.getElementById("search-results");
  const searchMessage = document.getElementById("search-message");
  const showAllWrapper = document.getElementById("show-all-wrapper");

  if (!searchInput || !allGamesContainer) return;

  searchInput.value = "";
  allGamesContainer.style.display = "grid";
  searchResultsContainer.style.display = "none";
  searchMessage.textContent = "";
  showAllWrapper.style.display = "none";
  searchResultsContainer.innerHTML = "";
}

window.addEventListener("pageshow", function () {
  resetSearchUI(); // Clear on back-navigation or full reload
});

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.querySelector(".search-input");
  const allGamesContainer = document.getElementById("gameList");
  const searchResultsContainer = document.getElementById("search-results");
  const searchMessage = document.getElementById("search-message");
  const showAllWrapper = document.getElementById("show-all-wrapper");
  const showAllBtn = document.getElementById("show-all-btn");
  const allGameCards = Array.from(
    allGamesContainer.querySelectorAll(".game_section2")
  );

  searchInput.addEventListener("input", function () {
    const query = searchInput.value.trim().toLowerCase();

    if (query === "") {
      // Show original game list, hide search results
      allGamesContainer.style.display = "grid";
      searchResultsContainer.style.display = "none";
      searchMessage.textContent = "";
      showAllWrapper.style.display = "none";
      searchResultsContainer.innerHTML = ""; // Clear any previous results
    } else {
      // Hide original game list, show search results
      allGamesContainer.style.display = "grid";
      searchResultsContainer.style.display = "grid";
      searchResultsContainer.innerHTML = ""; // Clear previous
      showAllWrapper.style.display = "flex";

      const matchingGames = allGameCards.filter((card) => {
        const gameName = card
          .querySelector(".game_section6 p")
          .textContent.toLowerCase();
        return gameName.includes(query);
      });

      if (matchingGames.length === 0) {
        searchMessage.textContent = `Sorry, no games found with this keyword... try something else`;
        searchMessage.style.textAlign = "center";
        showAllBtn.style.display = "flex";
        showAllBtn.style.marginBottom = "12px";
        searchResultsContainer.style.margin = "0px";
        searchResultsContainer.style.padding = "0px";
      } else {
        searchMessage.textContent = `Showing results for "${query}"`;
        searchMessage.style.paddingBottom = "6px";
        searchMessage.style.textAlign = "start";
        matchingGames.forEach((card) => {
          searchResultsContainer.appendChild(card.cloneNode(true));
        });
        showAllBtn.style.display = "none";
        searchResultsContainer.style.marginBottom = "12px";
      }
    }
  });

  // Handle dynamically added game_section2 in search results
  const searchResultsElement = document.getElementById("search-results");
  if (searchResultsElement) {
    searchResultsElement.addEventListener("click", function (e) {
      const section = e.target.closest(".game_section2");
      if (!section) return;

      e.preventDefault();

      // Use safeGetItem from redeemcoin.js if available, otherwise fallback to localStorage
      const getCoins = function () {
        if (typeof window.safeGetItem === "function") {
          return parseInt(window.safeGetItem("coins")) || 0;
        }
        try {
          return parseInt(localStorage.getItem("coins")) || 0;
        } catch (e) {
          console.warn("LocalStorage getItem blocked:", e);
          return 0;
        }
      };

      const setCoins = function (value) {
        if (typeof window.safeSetItem === "function") {
          window.safeSetItem("coins", value);
        } else {
          try {
            localStorage.setItem("coins", value);
          } catch (e) {
            console.warn("LocalStorage setItem blocked:", e);
          }
        }
      };

      const userCoins = getCoins();
      const requiredCoins = 10;

      // Set clickedGameUrl on window object so it's accessible from redeemcoin.js
      const gameUrl = section.querySelector("a").href;
      window.clickedGameUrl = gameUrl;

      if (userCoins < requiredCoins) {
        // Call showOopsPopup from redeemcoin.js if available
        if (typeof window.showOopsPopup === "function") {
          window.showOopsPopup();
        } else {
          console.warn("showOopsPopup function not found");
        }
      } else {
        // Deduct coins
        const updatedCoins = userCoins - requiredCoins;
        setCoins(updatedCoins);
        const coinEl = document.getElementById("coin");
        if (coinEl) coinEl.textContent = updatedCoins;

        // Redirect to the game
        window.location.href = gameUrl;
      }
    });
  }
});

