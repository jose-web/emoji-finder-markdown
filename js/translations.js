// ---------- Background translation of emoji names (Chrome Translator API) ----------
// The names are translated once into the browser's language and cached; the
// translations are never shown, they only let simple searches like "fuego"
// match instantly without waiting for the AI search.

const USER_LANG = (navigator.language || "en").split("-")[0].toLowerCase()
const TRANSLATION_CACHE_KEY = `emoji-translations-${USER_LANG}`
const TRANSLATION_BATCH = 40

let TRANSLATIONS = {}           // emoji name -> normalized translation
let translationStarted = false

async function initTranslations() {
    if (USER_LANG === "en" || !("Translator" in self)) return

    const options = { sourceLanguage: "en", targetLanguage: USER_LANG }
    let availability
    try {
        availability = await Translator.availability(options)
    } catch (err) {
        return
    }
    if (availability === "unavailable") return

    try { TRANSLATIONS = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY)) || {} } catch (e) { }

    if (availability === "available") {
        translateNames(options)
    } else {
        // Downloading the language pack needs a user gesture.
        const start = () => translateNames(options)
        window.addEventListener("pointerdown", start, { once: true })
        window.addEventListener("keydown", start, { once: true })
    }
}

async function translateNames(options) {
    if (translationStarted) return
    translationStarted = true

    const pending = EMOJI_NAMES.filter(name => !(name in TRANSLATIONS))
    if (!pending.length) return

    let translator
    try {
        translator = await Translator.create(options)
    } catch (err) {
        console.warn("Translator not usable:", err)
        return
    }

    for (let i = 0; i < pending.length; i += TRANSLATION_BATCH) {
        const batch = pending.slice(i, i + TRANSLATION_BATCH)
        const phrases = batch.map(name => name.replace(/_/g, " "))

        // One call per batch (one name per line); fall back to one by one
        // if the line count doesn't survive the translation.
        let results = null
        try {
            const lines = (await translator.translate(phrases.join("\n"))).split("\n")
            if (lines.length === batch.length) results = lines
        } catch (e) { }
        if (!results) {
            results = []
            for (const phrase of phrases) {
                try { results.push(await translator.translate(phrase)) } catch (e) { results.push("") }
            }
        }

        batch.forEach((name, j) => { TRANSLATIONS[name] = normalize(results[j].trim()) })
        try { localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(TRANSLATIONS)) } catch (e) { }

        // Yield so the page stays responsive.
        await new Promise(resolve => (self.requestIdleCallback || setTimeout)(resolve))
    }
    translator.destroy()
}
