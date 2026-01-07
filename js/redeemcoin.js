let adLoading = false;
let adResetTimer = null;
// Use window object to make clickedGameUrl accessible from other scripts
window.clickedGameUrl = window.clickedGameUrl || null;
let adCurrentlyShowing = false; // Track if ad is actively showing
let adTimeout = null; // Store timeout reference
let currentButtonElement = null; // Track which button triggered the ad
let currentButtonOriginalText = null; // Store original button text
let adWasViewed = false; // Track if ad was successfully viewed (prevents premature state reset)
let skipBtn = null; // Store skip button reference for popup

/* ---------------- SAFE LOCALSTORAGE HELPERS ---------------- */
function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("LocalStorage getItem blocked:", e);
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("LocalStorage setItem blocked:", e);
  }
}

/* ---------------- PAGE LOAD: INIT COINS ---------------- */
document.addEventListener("DOMContentLoaded", function () {
  const userCoins = parseInt(safeGetItem("coins")) || 0;
  const coinEl = document.getElementById("coin");
  if (coinEl) coinEl.textContent = userCoins;
  
  // Initialize Ad Placement API configuration
  // Reference: https://developers.google.com/ad-placement/apis
  if (typeof adConfig !== 'undefined') {
    adConfig({
      sound: 'on',  // Sound is enabled in the game
      preloadAdBreaks: 'on'  // Automatically preload ads
    });
  }
});

/* ---------------- EARN COINS BUTTON ---------------- */
const earnCoinBtn = document.getElementById("earnCoinBtn");
if (earnCoinBtn) {
  earnCoinBtn.addEventListener("click", function () {
    // Prevent multiple clicks while ad is loading/showing
    if (adLoading || adCurrentlyShowing) return;

    const earnBtn = document.getElementById("earnCoinBtn");
    const originalText = earnBtn.innerHTML;
    currentButtonElement = earnBtn;
    currentButtonOriginalText = originalText;

    // Show loading state
    earnBtn.innerHTML = "Loading Ad... ⏳";
    earnBtn.disabled = true;
    adLoading = true;
    adWasViewed = false; // Reset flag for new ad

    // Set timeout for ad loading - will be cleared when ad actually starts showing
    adTimeout = setTimeout(() => {
      // Only show error if ad is not currently showing
      if (!adCurrentlyShowing) {
        earnBtn.innerHTML = originalText;
        earnBtn.disabled = false;
        ErrorToast();
        resetAdState();
        currentButtonElement = null;
        currentButtonOriginalText = null;
      }
    }, 7000);

    // Check if Ad Placement API is initialized
    if (typeof adBreak === 'undefined') {
      console.warn("Ad Placement API not initialized. Make sure the initialization script is included in the HTML head.");
      if (adTimeout) {
        clearTimeout(adTimeout);
        adTimeout = null;
      }
      earnBtn.innerHTML = originalText;
      earnBtn.disabled = false;
      ErrorToast();
      resetAdState();
      currentButtonElement = null;
      currentButtonOriginalText = null;
      return;
    }

    // Use adBreak directly for rewarded ads
    adBreak({
      type: 'reward',
      name: 'earn-coins',
      beforeReward: (showAdFn) => {
        // Rewarded ad is available - showAdFn must be called as part of a direct user action
        if (showAdFn) {
          try {
            showAdFn(); // This triggers the ad to show
          } catch (error) {
            console.warn("Error showing rewarded ad:", error);
            if (adTimeout) {
              clearTimeout(adTimeout);
              adTimeout = null;
            }
            earnBtn.innerHTML = originalText;
            earnBtn.disabled = false;
            resetAdState();
            currentButtonElement = null;
            currentButtonOriginalText = null;
          }
        }
      },
      beforeAd: () => {
        // Called before ad is shown - pause game, mute sound, disable buttons
        adCurrentlyShowing = true;
        // Clear any pending timeout since ad is now showing
        if (adTimeout) {
          clearTimeout(adTimeout);
          adTimeout = null;
        }
      },
      adViewed: () => {
        // Ad was fully viewed - player earned the reward
        adWasViewed = true;
        addCoins(10);
        showToast();
        // Delay state reset to ensure ad is fully closed (important for longer ads)
        setTimeout(() => {
          adCurrentlyShowing = false;
          if (currentButtonElement) {
            currentButtonElement.innerHTML = currentButtonOriginalText;
            currentButtonElement.disabled = false;
          }
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
        }, 1000); // Increased delay for longer ads (30+ seconds)
      },
      adDismissed: () => {
        // Ad was dismissed before completion - player did not earn reward
        console.log("Ad skipped or closed early.");
        // Don't reset state immediately - wait for afterAd
      },
      afterAd: () => {
        // Called after ad is dismissed - resume game, unmute sound, re-enable buttons
        // Only reset if ad wasn't viewed (if viewed, adViewed callback handles it)
        if (!adWasViewed) {
          adCurrentlyShowing = false;
          if (currentButtonElement) {
            currentButtonElement.innerHTML = currentButtonOriginalText;
            currentButtonElement.disabled = false;
          }
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
        }
      },
      adBreakDone: (placementInfo) => {
        // Always called even if an ad wasn't shown
        // If no ad was available, this is the only callback that fires
        if (!adCurrentlyShowing && adLoading) {
          // No ad was shown - clear timeout and reset
          if (adTimeout) {
            clearTimeout(adTimeout);
            adTimeout = null;
          }
          if (currentButtonElement) {
            currentButtonElement.innerHTML = currentButtonOriginalText;
            currentButtonElement.disabled = false;
          }
          ErrorToast();
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
        }
      }
    });
  });
}


/* ---------------- GAME SECTION CLICK ---------------- */
document.querySelectorAll(".game_section2").forEach((section) => {
  section.addEventListener("click", function (e) {
    e.preventDefault();

    const userCoins = parseInt(safeGetItem("coins")) || 0;
    const requiredCoins = 10;

    window.clickedGameUrl = this.querySelector("a").href;

    if (userCoins < requiredCoins) {
      showOopsPopup();
    } else {
      const updatedCoins = userCoins - requiredCoins;
      safeSetItem("coins", updatedCoins);
      document.getElementById("coin").textContent = updatedCoins;
      if (window.clickedGameUrl) window.location.href = window.clickedGameUrl;
    }
  });
});

/* ---------------- TOAST ---------------- */
function showToast() {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast-message";
    toast.innerHTML = `
      <img src="/assets/correct.png" alt="" style="width:20px;height:20px;margin-right:8px;">
      You've received 10 coins
    `;
    document.body.appendChild(toast);
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 5000);
}

function ErrorToast() {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast-message";
    toast.innerHTML = `
     ❌ Ad not available, try again later
    `;
    document.body.appendChild(toast);
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 5000);
}

/* ---------------- ADD COINS ---------------- */
function addCoins(amount) {
  let coins = parseInt(safeGetItem("coins")) || 0;
  coins += amount;
  safeSetItem("coins", coins);
  document.getElementById("coin").textContent = coins;
}

/* ---------------- RESET AD STATE ---------------- */
function resetAdState() {
  adLoading = false;
  adCurrentlyShowing = false;
  adWasViewed = false;
  if (adResetTimer) {
    clearTimeout(adResetTimer);
    adResetTimer = null;
  }
  if (adTimeout) {
    clearTimeout(adTimeout);
    adTimeout = null;
  }
}

/* ---------------- OOPS POPUP ---------------- */
function showOopsPopup() {
  const existingPopup = document.getElementById("oopsPopup");
  if (existingPopup) existingPopup.remove();

  const popupHTML = `
    <div id="oopsPopup" class="popup" style="display:flex" data-clarity-mask="true">
      <div class="popup-data">
        <img class="oops-img" src="/assets/icons/oops.png" alt="Oops!" />
        <p class="main-text">You don't have enough coins to join this contest.</p>
        <p class="sub-text">Just watch an ad & earn 10 coins</p>
        <div class="watch-btn-wrapper">
          <button id="watchAdBtn" class="watch-btn shimmer-btn">Claim</button>
          <span class="ad-tag">Ad</span>
        </div>
        <button id="skipBtn" class="skip-btn">Skip</button>
      </div>
    </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = popupHTML;
  document.body.appendChild(wrapper.firstElementChild);

  console.log("Popup opened:"); // Debug log for Clarity

  const watchBtn = document.getElementById("watchAdBtn");
  skipBtn = document.getElementById("skipBtn");
  const originalText = watchBtn.innerHTML;

  /* Skip handler */
  skipBtn.addEventListener("click", function () {
    // Don't redirect if ad is currently showing
    if (adCurrentlyShowing) {
      console.log("Cannot skip while ad is showing");
      return;
    }
    if (window.clickedGameUrl) window.location.href = window.clickedGameUrl;
    closeOopsPopup();
    skipBtn = null;
  });

  /* Watch Ad handler */
  watchBtn.addEventListener("click", function () {
    // Prevent multiple clicks while ad is loading/showing
    if (adLoading || adCurrentlyShowing) return;
    
    watchBtn.innerHTML = "Loading Ad... ⏳";
    watchBtn.disabled = true;
    skipBtn.disabled = true;
    currentButtonElement = watchBtn;
    currentButtonOriginalText = originalText;
    adWasViewed = false; // Reset flag for new ad

    // Set timeout for ad loading - will be cleared when ad actually starts showing
    adTimeout = setTimeout(() => {
      // Only redirect if ad is not currently showing
      if (!adCurrentlyShowing) {
        watchBtn.innerHTML = originalText;
        watchBtn.disabled = false;
        skipBtn.disabled = false;
        if (window.clickedGameUrl) window.location.href = window.clickedGameUrl;
        closeOopsPopup();
        resetAdState();
        currentButtonElement = null;
        currentButtonOriginalText = null;
      }
    }, 7000);

    adLoading = true;

    // Check if Ad Placement API is initialized
    if (typeof adBreak === 'undefined') {
      console.warn("Ad Placement API not initialized. Make sure the initialization script is included in the HTML head.");
      if (adTimeout) {
        clearTimeout(adTimeout);
        adTimeout = null;
      }
      watchBtn.innerHTML = originalText;
      watchBtn.disabled = false;
      skipBtn.disabled = false;
      if (window.clickedGameUrl) window.location.href = window.clickedGameUrl;
      closeOopsPopup();
      resetAdState();
      currentButtonElement = null;
      currentButtonOriginalText = null;
      return;
    }

    // Use adBreak directly for rewarded ads
    adBreak({
      type: 'reward',
      name: 'earn-coins-popup',
      beforeReward: (showAdFn) => {
        // Rewarded ad is available - showAdFn must be called as part of a direct user action
        if (showAdFn) {
          try {
            showAdFn(); // This triggers the ad to show
          } catch (error) {
            console.warn("Error showing rewarded ad:", error);
            if (adTimeout) {
              clearTimeout(adTimeout);
              adTimeout = null;
            }
            watchBtn.innerHTML = originalText;
            watchBtn.disabled = false;
            skipBtn.disabled = false;
            if (window.clickedGameUrl) window.location.href = window.clickedGameUrl;
            closeOopsPopup();
            resetAdState();
            currentButtonElement = null;
            currentButtonOriginalText = null;
          }
        }
      },
      beforeAd: () => {
        // Called before ad is shown - pause game, mute sound, disable buttons
        adCurrentlyShowing = true;
        // Clear any pending timeout since ad is now showing
        if (adTimeout) {
          clearTimeout(adTimeout);
          adTimeout = null;
        }
      },
      adViewed: () => {
        // Ad was fully viewed - player earned the reward
        adWasViewed = true;
        addCoins(10);
        showToast();
        // Wait longer for ad to fully close before redirecting (important for 30+ second ads)
        setTimeout(() => {
          // User earned coins, now redirect to game
          if (window.clickedGameUrl) {
            window.location.href = window.clickedGameUrl;
          }
          closeOopsPopup();
          // Reset state after redirect is initiated
          adCurrentlyShowing = false;
          if (currentButtonElement) {
            currentButtonElement.innerHTML = currentButtonOriginalText;
            currentButtonElement.disabled = false;
          }
          if (skipBtn) {
            skipBtn.disabled = false;
          }
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
          skipBtn = null;
        }, 1500); // Increased delay for longer ads (30+ seconds) to ensure ad is fully closed
      },
      adDismissed: () => {
        // Ad was dismissed before completion - player did not earn reward
        // Don't redirect - let user decide what to do
        console.log("Ad dismissed - no reward earned");
        // Don't reset state immediately - wait for afterAd
      },
      afterAd: () => {
        // Called after ad is dismissed - resume game, unmute sound, re-enable buttons
        // Only reset if ad wasn't viewed (if viewed, adViewed callback handles it)
        if (!adWasViewed) {
          adCurrentlyShowing = false;
          if (currentButtonElement) {
            currentButtonElement.innerHTML = currentButtonOriginalText;
            currentButtonElement.disabled = false;
          }
          if (skipBtn) {
            skipBtn.disabled = false;
          }
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
          skipBtn = null;
        }
      },
      adBreakDone: (placementInfo) => {
        // Always called even if an ad wasn't shown
        // If no ad was available, this is the only callback that fires
        if (!adCurrentlyShowing && adLoading) {
          // No ad was shown - clear timeout and redirect
          if (adTimeout) {
            clearTimeout(adTimeout);
            adTimeout = null;
          }
          if (currentButtonElement) {
            currentButtonElement.innerHTML = currentButtonOriginalText;
            currentButtonElement.disabled = false;
          }
          if (skipBtn) {
            skipBtn.disabled = false;
          }
          if (window.clickedGameUrl) window.location.href = window.clickedGameUrl;
          closeOopsPopup();
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
          skipBtn = null;
        }
      }
    });
  });
}

function closeOopsPopup() {
  const popup = document.getElementById("oopsPopup");
  if (popup) popup.remove();
  skipBtn = null;
}
