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
document.getElementById("earnCoinBtn").addEventListener("click", function () {
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

  initializeAds(8597806557, (rewardedAd) => {
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

/* ---------------- AD INITIALIZER ---------------- */
function initializeAds(adSlot, callback) {
  adLoading = true;
  window.adsbygoogle = window.adsbygoogle || [];

  adsbygoogle.push({
    params: {
      google_ad_loaded_callback: callback,
      google_ad_slot: adSlot,
      google_ad_format: "rewarded",
    },
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

    initializeAds(8597806557, (rewardedAd) => {
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
