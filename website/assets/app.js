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
    button.textContent = "Select";
    if (status) status.textContent = "Copy failed. Select the code manually.";
    target?.focus?.();
  }

  window.setTimeout(() => {
    button.textContent = previous;
  }, 1800);
});

document.addEventListener("click", (event) => {
  const openMenu = document.querySelector(".more-nav[open]");
  if (openMenu && !openMenu.contains(event.target)) openMenu.removeAttribute("open");
});
