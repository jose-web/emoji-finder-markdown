// ---------- Shared helpers ----------

function escapeHTML(text) {
    return text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
}

// Lowercase and strip accents, so "corazon" matches "corazón".
function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

let toastTimer

function showToast(message, isError = false) {
    const toast = document.getElementById("toast")
    document.getElementById("toast-text").textContent = message
    toast.classList.toggle("error", isError)
    toast.classList.add("show")
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800)
}

// Briefly mark a card as "copied" or "inserted".
function flashCard(card, className) {
    card.classList.remove("copied", "inserted")
    card.classList.add(className)
    setTimeout(() => card.classList.remove(className), 1000)
}
