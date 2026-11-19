// ---------- Search ----------

// Name matches first, then matches on the translated name (word prefix).
function searchLocal(query) {
    const byName = EMOJI_NAMES.filter(name => name.includes(query))
    if (!query) return byName

    const q = " " + normalize(query)
    const seen = new Set(byName)
    const byTranslation = EMOJI_NAMES.filter(name =>
        !seen.has(name) && TRANSLATIONS[name] && (" " + TRANSLATIONS[name]).includes(q))
    return byName.concat(byTranslation)
}

function find(event) {
    const query = event.target.value.trim().toLowerCase()
    const exact = searchLocal(query)

    cancelAI()
    const useAI = isAIEnabled() && query.length >= AI_MIN_QUERY
    render(exact, [], useAI)

    if (useAI) scheduleAISearch(query, exact)
}

function randomEmoji() {
    if (!EMOJI_NAMES.length) return
    const search = document.getElementById("search")
    search.value = EMOJI_NAMES[Math.floor(Math.random() * EMOJI_NAMES.length)]
    search.dispatchEvent(new Event("input"))
}
