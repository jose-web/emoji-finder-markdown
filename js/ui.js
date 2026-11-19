// ---------- Theme toggle and back-to-top button ----------

function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light"
    document.documentElement.dataset.theme = next
    try { localStorage.setItem("theme", next) } catch (e) { }
}

function initBackToTop() {
    const button = document.getElementById("to-top")
    const update = () => button.classList.toggle("visible", window.scrollY > 400)
    window.addEventListener("scroll", update, { passive: true })
    update()
    button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }))
}
