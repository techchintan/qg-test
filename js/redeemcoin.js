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
let interstitialSlot = null; // GPT interstitial slot reference

/* ---------------- GPT HELPERS (INTERSTITIAL & REWARDED) ---------------- */
function ensureGptBaseInitialized() {
  window.googletag = window.googletag || { cmd: [] };
  googletag.cmd.push(function () {
    try {
      const pubads = googletag.pubads();
      pubads.enableSingleRequest();
      googletag.enableServices();
    } catch (e) {
      console.warn("Error enabling GPT services:", e);
    }
  });
}

function showGptInterstitial({ onShown, onError } = {}) {
  window.googletag = window.googletag || { cmd: [] };
  ensureGptBaseInitialized();

  // Create or show a full-screen overlay that will host
  // a standard GPT display slot for the start interstitial.
  const slotContainerId = "gpt-start-interstitial-slot";
  let overlay = document.getElementById("gpt-start-interstitial-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "gpt-start-interstitial-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
      <div id="${slotContainerId}" style="position:relative;width:320px;height:480px;background:#000;">
        <button id="gpt-start-interstitial-close" style="position:absolute;top:8px;right:8px;z-index:2;">✕</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = document.getElementById("gpt-start-interstitial-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        overlay.style.display = "none";
      });
    }
  } else {
    overlay.style.display = "flex";
  }

  googletag.cmd.push(function () {
    try {
      const pubads = googletag.pubads();

      if (!interstitialSlot) {
        interstitialSlot = googletag
          .defineSlot(
            "/21902364955,23012459894/CM_qwiqgames.com_Games_And_Entertainment_Top/CM_qwiqgames.com_Games_And_Entertainment_Interstitial",
            [320, 480],
            slotContainerId
          )
          .addService(pubads);
      }

      if (!interstitialSlot) {
        if (onError) onError(new Error("Failed to create interstitial slot"));
        const overlayEl = document.getElementById(
          "gpt-start-interstitial-overlay"
        );
        if (overlayEl) overlayEl.style.display = "none";
        return;
      }

      if (onShown) onShown();
      googletag.display(slotContainerId);
    } catch (e) {
      console.warn("Error showing interstitial ad:", e);
      if (onError) onError(e);
      const overlayEl = document.getElementById(
        "gpt-start-interstitial-overlay"
      );
      if (overlayEl) overlayEl.style.display = "none";
    }
  });
}

function showGptRewardedAd({ onStart, onReward, onClosed, onError } = {}) {
  window.googletag = window.googletag || { cmd: [] };
  ensureGptBaseInitialized();

  googletag.cmd.push(function () {
    try {
      const pubads = googletag.pubads();
      const rewardedSlot = googletag
        .defineOutOfPageSlot(
          "/21902364955,23012459894/CM_qwiqgames.com_Games_And_Entertainment_Top/CM_qwiqgames.com_Games_And_Entertainment_Rewarded",
          googletag.enums.OutOfPageFormat.REWARDED
        )
        .addService(pubads);

      const handleReady = function (evt) {
        try {
          evt.makeRewardedVisible();
        } catch (e) {
          console.warn("Error making rewarded visible:", e);
        }
        if (onStart) onStart();
      };

      const handleGranted = function (evt) {
        if (onReward) onReward(evt);
      };

      const handleClosed = function (evt) {
        pubads.removeEventListener("rewardedSlotReady", handleReady);
        pubads.removeEventListener("rewardedSlotGranted", handleGranted);
        pubads.removeEventListener("rewardedSlotClosed", handleClosed);
        googletag.destroySlots([rewardedSlot]);
        if (onClosed) onClosed(evt);
      };

      pubads.addEventListener("rewardedSlotReady", handleReady);
      pubads.addEventListener("rewardedSlotGranted", handleGranted);
      pubads.addEventListener("rewardedSlotClosed", handleClosed);

      googletag.display(rewardedSlot);
    } catch (e) {
      console.warn("Error setting up rewarded ad:", e);
      if (onError) onError(e);
    }
  });
}

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

/* ---------------- AUTO-LOAD START AD (INTERSTITIAL) ==================== */
function loadStartAd() {
  showGptInterstitial({
    onShown: () => {
      console.log("Interstitial start ad is about to show");
      dataLayer.push({ event: "start_ad_viewed" });
    },
    onError: (err) => {
      console.warn("Failed to show interstitial start ad:", err);
    },
  });
}

/* ---------------- PAGE LOAD: INIT COINS ---------------- */
document.addEventListener("DOMContentLoaded", function () {
  const userCoins = parseInt(safeGetItem("coins")) || 0;
  const coinEl = document.getElementById("coin");
  if (coinEl) coinEl.textContent = userCoins;

  // Auto-load start ad after 5 seconds - only on homepage
  const isHomepage = window.location.pathname === '/' ||
    window.location.pathname === '/index.html' ||
    window.location.pathname.endsWith('/index.html');

  if (isHomepage) {
    setTimeout(() => {
      loadStartAd();
    }, 5000);
  }
});

/* ---------------- EARN COINS BUTTON ---------------- */
const earnCoinBtn = document.getElementById("earnCoinBtn");
if (earnCoinBtn) {
  earnCoinBtn.addEventListener("click", function () {
    dataLayer.push({ event: "earn_coins_button_clicked" });
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

    // Use GPT rewarded ads (no AdSense adBreak dependency)
    showGptRewardedAd({
      onStart: () => {
        adCurrentlyShowing = true;
        if (adTimeout) {
          clearTimeout(adTimeout);
          adTimeout = null;
        }
      },
      onReward: () => {
        adWasViewed = true;
        addCoins(10);
        showToast();
        setTimeout(() => {
          adCurrentlyShowing = false;
          if (currentButtonElement) {
            currentButtonElement.innerHTML = currentButtonOriginalText;
            currentButtonElement.disabled = false;
          }
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
        }, 1000);
      },
      onClosed: () => {
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
      onError: () => {
        if (!adCurrentlyShowing && adLoading) {
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
      },
    });
  });
}

/* ---------------- GAME SECTION CLICK ---------------- */
document.querySelectorAll(".game_section2").forEach((section) => {
  section.addEventListener("click", function (e) {
    dataLayer.push({ event: "game_section_clicked" });
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

/* ---------------- GAME CATEGORY BUTTON CLICK ---------------- */
document.querySelectorAll(".game-category-button").forEach((button) => {
  button.addEventListener("click", function (e) {
    dataLayer.push({
      event: "game_category_button_clicked",
    });
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
    dataLayer.push({
      event: "popup_skip_ad_button_clicked",
    });
    // Don't redirect if ad is currently showing
    if (adCurrentlyShowing) {
      console.log("Cannot skip while ad is showing");
      return;
    }
    // if (window.clickedGameUrl) window.location.href = window.clickedGameUrl;
    window.location.reload();
    closeOopsPopup();
    skipBtn = null;
  });

  /* Watch Ad handler */
  watchBtn.addEventListener("click", function () {
    dataLayer.push({
      event: "popup_watch_ad_button_clicked",
    });
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

    // Use GPT rewarded ads
    showGptRewardedAd({
      onStart: () => {
        adCurrentlyShowing = true;
        if (adTimeout) {
          clearTimeout(adTimeout);
          adTimeout = null;
        }
      },
      onReward: () => {
        adWasViewed = true;
        addCoins(10);
        showToast();
        setTimeout(() => {
          if (window.clickedGameUrl) {
            window.location.href = window.clickedGameUrl;
          }
          closeOopsPopup();
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
        }, 1500);
      },
      onClosed: () => {
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
      onError: () => {
        if (!adCurrentlyShowing && adLoading) {
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
          if (window.clickedGameUrl)
            window.location.href = window.clickedGameUrl;
          closeOopsPopup();
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
          skipBtn = null;
        }
      },
    });
  });
}

function closeOopsPopup() {
  const popup = document.getElementById("oopsPopup");
  if (popup) popup.remove();
  skipBtn = null;
}

/* ---------------- PLAY GAME BUTTON ---------------- */
const playGameBtn = document.getElementById("play-game-btn");
if (playGameBtn) {
  playGameBtn.addEventListener("click", () => {
    const playOverlay = document.querySelector(".play-overlay");

    dataLayer.push({ event: "play_game_button_clicked" });
    // Prevent multiple clicks while ad is loading/showing
    if (adLoading || adCurrentlyShowing) return;

    const originalText = playGameBtn.innerHTML;
    currentButtonElement = playGameBtn;
    currentButtonOriginalText = originalText;

    // Show loading state
    playGameBtn.innerHTML = "Loading Ad... ⏳";
    playGameBtn.disabled = true;
    adLoading = true;
    adWasViewed = false; // Reset flag for new ad

    // Set timeout for ad loading - will be cleared when ad actually starts showing
    adTimeout = setTimeout(() => {
      // Only show error if ad is not currently showing
      if (!adCurrentlyShowing) {
        playGameBtn.innerHTML = originalText;
        playGameBtn.disabled = false;
        ErrorToast();
        resetAdState();
        currentButtonElement = null;
        currentButtonOriginalText = null;
      }
    }, 7000);

    // Use GPT rewarded ads
    showGptRewardedAd({
      onStart: () => {
        adCurrentlyShowing = true;
        if (adTimeout) {
          clearTimeout(adTimeout);
          adTimeout = null;
        }
      },
      onReward: () => {
        adWasViewed = true;
        if (playOverlay) {
          playOverlay.remove();
        }
        setTimeout(() => {
          adCurrentlyShowing = false;
          if (currentButtonElement) {
            currentButtonElement.innerHTML = currentButtonOriginalText;
            currentButtonElement.disabled = false;
          }
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
        }, 1000);
      },
      onClosed: () => {
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
      onError: () => {
        if (!adCurrentlyShowing && adLoading) {
          if (adTimeout) {
            clearTimeout(adTimeout);
            adTimeout = null;
          }
          if (currentButtonElement) {
            currentButtonElement.innerHTML = currentButtonOriginalText;
            currentButtonElement.disabled = false;
          }
          ErrorToast();
          if (playOverlay) {
            playOverlay.remove();
          }
          resetAdState();
          currentButtonElement = null;
          currentButtonOriginalText = null;
        }
      },
    });
  });
}
