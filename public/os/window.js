
window.openWindow = function(id, title, content) {
    const win = document.createElement("div");
    win.className = "window";
    win.innerHTML = `<div class='titlebar'>${title}</div><div class='content'>${content}</div>`;
    document.body.appendChild(win);
    win.style.left = (100 + Math.random()*200) + "px";
    win.style.top = (100 + Math.random()*200) + "px";
    win.addEventListener("mousedown", () => win.style.zIndex = Date.now());
};
