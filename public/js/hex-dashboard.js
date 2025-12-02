// ============================================
// Vox OS – Hex Dashboard Logic
// Matches memory console simplicity + behavior
// ============================================

// Get all hex tiles
const hexTiles = document.querySelectorAll(".hex");

// Click to navigate
hexTiles.forEach(tile => {
  const target = tile.getAttribute("data-link");

  if (!target) return;

  tile.addEventListener("click", () => {
    window.location.href = target;
  });

  // Keyboard support
  tile.setAttribute("tabindex", "0");

  tile.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      window.location.href = target;
    }
  });
});
