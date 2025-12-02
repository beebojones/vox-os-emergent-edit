// ============================================
// Vox OS – Avatar Upload + Persistence
// ============================================

const avatarInput = document.getElementById("avatarUpload");
const avatarImage = document.getElementById("avatarImage");

// Load saved avatar if exists
const savedAvatar = localStorage.getItem("voxAvatar");
if (savedAvatar) {
  avatarImage.src = savedAvatar;
}

// Handle user upload
avatarInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    avatarImage.src = dataUrl;

    // Save to localStorage
    localStorage.setItem("voxAvatar", dataUrl);
  };

  reader.readAsDataURL(file);
});
