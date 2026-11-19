// ---------- Entry point: wires everything together ----------

window.onload = function () {
    loadEmojis()
    checkAI()
    initComposer()
    initBackToTop()

    document.getElementById("search").addEventListener("input", find)
    document.getElementById("emojis").addEventListener("click", onEmojiClick)
    document.getElementById("random").addEventListener("click", randomEmoji)
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme)
}
