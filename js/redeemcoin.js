let adLoading = false;
let adResetTimer = null;
let clickedGameUrl = null;

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
});

/* ---------------- EARN COINS BUTTON ---------------- */
const earnCoinBtn = document.getElementById("earnCoinBtn");
if (earnCoinBtn) {
  earnCoinBtn.addEventListener("click", function () {
    if (adLoading) return;

    const earnBtn = document.getElementById("earnCoinBtn");
    const originalText = earnBtn.innerHTML;

    // Show loading state
    earnBtn.innerHTML = "Loading Ad... ⏳";
    earnBtn.disabled = true;
    adLoading = true;

    let adTimeout = setTimeout(() => {
      earnBtn.innerHTML = originalText;
      earnBtn.disabled = false;
      ErrorToast();
      resetAdState();
    }, 7000);

    initializeAds((rewardedAd) => {
      if (rewardedAd) {
        clearTimeout(adTimeout);
        rewardedAd.show((result) => {
          if (result && result.status === "viewed") {
            addCoins(10);
            showToast();
          } else {
            console.log("Ad skipped or closed early.");
          }

          earnBtn.innerHTML = originalText;
          earnBtn.disabled = false;
          resetAdState();
        });
      } else {
        clearTimeout(adTimeout);
        earnBtn.innerHTML = originalText;
        earnBtn.disabled = false;
        resetAdState();
      }
    });
  });
}

/* ---------------- AD INITIALIZER ---------------- */
// Using Google Ad Placement API for HTML5 games
// Reference: https://developers.google.com/ad-placement/docs/example
let currentAdCallback = null;
let adResultStatus = null;

function initializeAds(callback) {
  adLoading = true;
  currentAdCallback = callback;
  adResultStatus = null;
  
  // Check if Ad Placement API is available (included in AdSense script)
  if (typeof adBreak === 'undefined') {
    console.warn("Ad Placement API not loaded. Make sure AdSense script is loaded with data-adbreak-test attribute.");
    callback(null);
    return;
  }

  // Use adBreak with 'reward' placement type for rewarded ads
  // This follows the pattern from: https://developers.google.com/ad-placement/docs/example
  adBreak({
    type: 'reward',  // Rewarded ad placement type
    name: 'earn-coins',
    beforeReward: (showAdFn) => {
      // Rewarded ad is available - call showAdFn to display it
      // showAdFn must be called as part of a direct user action
      if (showAdFn) {
        try {
          showAdFn(); // This shows the ad immediately
        } catch (error) {
          console.warn("Error showing rewarded ad:", error);
          if (currentAdCallback) {
            currentAdCallback(null);
            currentAdCallback = null;
          }
        }
      } else {
        // No ad available
        if (currentAdCallback) {
          currentAdCallback(null);
          currentAdCallback = null;
        }
      }
    },
    beforeAd: () => {
      // Called before ad is shown - can disable buttons, mute sound, etc.
    },
    adViewed: () => {
      // Ad was fully viewed - user earned the reward
      adResultStatus = "viewed";
      if (currentAdCallback) {
        // Return a mock object compatible with existing code structure
        currentAdCallback({
          show: function(resultCallback) {
            resultCallback({ status: "viewed", rewardEarned: true });
          }
        });
        currentAdCallback = null;
      }
    },
    adDismissed: () => {
      // Ad was dismissed without earning reward
      adResultStatus = "dismissed";
      if (currentAdCallback) {
        // Return a mock object compatible with existing code structure
        currentAdCallback({
          show: function(resultCallback) {
            resultCallback({ status: "dismissed", rewardEarned: false });
          }
        });
        currentAdCallback = null;
      }
    },
    afterAd: () => {
      // Called after ad is dismissed - can re-enable buttons, unmute sound, etc.
      resetAdState();
    }
  });
}

/* ---------------- GAME SECTION CLICK ---------------- */
document.querySelectorAll(".game_section2").forEach((section) => {
  section.addEventListener("click", function (e) {
    e.preventDefault();

    const userCoins = parseInt(safeGetItem("coins")) || 0;
    const requiredCoins = 10;

    clickedGameUrl = this.querySelector("a").href;

    if (userCoins < requiredCoins) {
      showOopsPopup();
    } else {
      const updatedCoins = userCoins - requiredCoins;
      safeSetItem("coins", updatedCoins);
      document.getElementById("coin").textContent = updatedCoins;
      window.location.href = clickedGameUrl;
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
  if (adResetTimer) {
    clearTimeout(adResetTimer);
    adResetTimer = null;
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
  const skipBtn = document.getElementById("skipBtn");
  const originalText = watchBtn.innerHTML;

  /* Skip handler */
  skipBtn.addEventListener("click", function () {
    if (clickedGameUrl) window.location.href = clickedGameUrl;
    closeOopsPopup();
  });

  /* Watch Ad handler */
  watchBtn.addEventListener("click", function () {
    watchBtn.innerHTML = "Loading Ad... ⏳";
    watchBtn.disabled = true;
    skipBtn.disabled = true;

    let adTimeout = setTimeout(() => {
      watchBtn.innerHTML = originalText;
      watchBtn.disabled = false;
      skipBtn.disabled = false;
      if (clickedGameUrl) window.location.href = clickedGameUrl;
      closeOopsPopup();
    }, 7000);

    adLoading = true;

    initializeAds((rewardedAd) => {
      if (rewardedAd) {
        clearTimeout(adTimeout);
        rewardedAd.show((result) => {
          if (result && result.status === "viewed") {
            if (clickedGameUrl) {
              setTimeout(() => (window.location.href = clickedGameUrl), 100);
            }
          } else {
            if (clickedGameUrl) {
              setTimeout(() => (window.location.href = clickedGameUrl), 100);
            }
          }
          closeOopsPopup();
          watchBtn.innerHTML = originalText;
          watchBtn.disabled = false;
          skipBtn.disabled = false;
          resetAdState();
        });
      } else {
        clearTimeout(adTimeout);
        watchBtn.innerHTML = originalText;
        watchBtn.disabled = false;
        skipBtn.disabled = false;
        resetAdState();
      }
    });
  });
}

function closeOopsPopup() {
  const popup = document.getElementById("oopsPopup");
  if (popup) popup.remove();
}
