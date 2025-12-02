// Memory Inspector App
// Calls backend: GET /memory

async function fetchMemories() {
    const res = await fetch("/memory");
    if (!res.ok) {
        console.error("Failed to fetch memories");
        return [];
    }
    return await res.json();
}

// Elements
const listEl = document.getElementById("memoryItems");
const searchEl = document.getElementById("searchInput");
const detailTitle = document.getElementById("detail-title");
const detailCategory = document.getElementById("detail-category");
const detailContent = document.getElementById("detail-content");

let allMemories = [];
let filtered = [];

async function loadMemories() {
    allMemories = await fetchMemories();
    filtered = [...allMemories];
    renderList();
}

function renderList() {
    listEl.innerHTML = "";

    filtered.forEach(mem => {
        const item = document.createElement("div");
        item.className = "memory-item";

        const title = document.createElement("div");
        title.className = "memory-item-title";
        title.textContent = mem.summary || "(No summary)";

        const cat = document.createElement("div");
        cat.className = "memory-item-cat";
        cat.textContent = mem.category || "general";

        item.appendChild(title);
        item.appendChild(cat);

        item.onclick = () => showDetail(mem);

        listEl.appendChild(item);
    });
}

function showDetail(mem) {
    detailTitle.textContent = mem.summary || "(No summary)";
    detailCategory.textContent = `Category: ${mem.category || "general"}`;

    detailContent.innerHTML = `
        <div class="detail-section">
            <h3>Full Text</h3>
            <pre>${mem.text || "(empty)"}</pre>
        </div>

        <div class="detail-section">
            <h3>Embedding (first 6 numbers)</h3>
            <pre>${previewEmbedding(mem.embedding)}</pre>
        </div>

        <div class="detail-section">
            <h3>Pinned</h3>
            <pre>${mem.pinned ? "true" : "false"}</pre>
        </div>

        <div class="detail-buttons">
            <button onclick="deleteMemory(${mem.id})">Delete</button>
        </div>
    `;
}

function previewEmbedding(embedding) {
    if (!embedding) return "(none)";
    if (typeof embedding === "string") {
        try { embedding = JSON.parse(embedding); }
        catch { return "(invalid embedding JSON)"; }
    }
    return embedding.slice(0, 6).join(", ");
}

async function deleteMemory(id) {
    if (!confirm("Delete this memory?")) return;
    const res = await fetch(`/memory/${id}`, { method: "DELETE" });
    if (res.ok) {
        await loadMemories();
        detailTitle.textContent = "Select a memory";
        detailContent.innerHTML = "";
    } else {
        alert("Failed to delete");
    }
}

searchEl.addEventListener("input", () => {
    const q = searchEl.value.toLowerCase();
    filtered = allMemories.filter(m =>
        (m.summary || "").toLowerCase().includes(q) ||
        (m.text || "").toLowerCase().includes(q)
    );
    renderList();
});

// INIT
loadMemories();
