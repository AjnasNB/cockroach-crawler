function copyFallback(value) {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy command was rejected");
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  copyFallback(value);
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy-button");
  if (!button) return;

  const targetId = button.dataset.copy;
  const target = targetId ? document.getElementById(targetId) : null;
  const value = button.dataset.copyValue ?? target?.textContent ?? "";
  const statusId = button.getAttribute("aria-describedby");
  const status = statusId ? document.getElementById(statusId) : null;
  const previous = button.textContent;

  try {
    await copyText(value);
    button.textContent = "Copied";
    if (status) status.textContent = "Copied to clipboard.";
  } catch {
    const pre = target?.closest("pre");
    pre?.focus();
    if (target && window.getSelection) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    button.textContent = target ? "Selected" : "Select";
    if (status) status.textContent = target ? "Copy failed. Code selected for manual copy." : "Copy failed. Select the command manually.";
  }

  window.setTimeout(() => {
    button.textContent = previous;
  }, 1800);
});

document.addEventListener("click", (event) => {
  const openMenu = document.querySelector(".more-nav[open]");
  if (openMenu && !openMenu.contains(event.target)) openMenu.removeAttribute("open");
});

const currentMobileLink = document.querySelector('.mobile-nav [aria-current="page"]');
if (currentMobileLink && window.matchMedia("(max-width: 1060px)").matches) {
  currentMobileLink.scrollIntoView({ block: "nearest", inline: "center" });
}

const featureSearch = document.querySelector("[data-feature-search]");
const featureEntries = [...document.querySelectorAll("[data-feature-entry]")];
const featureCategoryButtons = [...document.querySelectorAll("[data-feature-category]")];
const featureCount = document.querySelector("[data-feature-count]");
let activeFeatureCategory = "all";

function updateFeatureCatalog() {
  if (!featureEntries.length) return;
  const query = featureSearch?.value.trim().toLowerCase() ?? "";
  let visible = 0;

  for (const entry of featureEntries) {
    const matchesCategory = activeFeatureCategory === "all" || entry.dataset.category === activeFeatureCategory;
    const matchesQuery = !query || entry.dataset.search?.includes(query);
    entry.hidden = !(matchesCategory && matchesQuery);
    if (!entry.hidden) visible += 1;
  }

  if (featureCount) featureCount.textContent = `${visible} ${visible === 1 ? "capability" : "capabilities"} shown`;
}

featureSearch?.addEventListener("input", updateFeatureCatalog);
for (const button of featureCategoryButtons) {
  button.addEventListener("click", () => {
    activeFeatureCategory = button.dataset.featureCategory ?? "all";
    for (const peer of featureCategoryButtons) {
      peer.setAttribute("aria-pressed", String(peer === button));
    }
    updateFeatureCatalog();
  });
}
