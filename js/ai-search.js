// ---------- AI search (Chrome Prompt API) ----------

const AI_DEBOUNCE_MS = 500
const AI_MIN_QUERY = 3
const AI_MAX_RESULTS = 60

const LM_OPTIONS = {
    expectedInputs: [{ type: "text", languages: ["en", "es"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
}

const SYSTEM_PROMPT = `You help people find GitHub emoji shortcodes.
The user types a word or short description, in English or Spanish.
Reply with up to 15 lowercase English keywords that represent that idea:
synonyms, related objects, feelings, and likely GitHub emoji shortcode names
(snake_case, without colons). Put the most relevant first.
Example: "fuego" -> fire, flame, hot, burn, fire_engine, volcano, firecracker`

const KEYWORDS_SCHEMA = {
    type: "object",
    properties: {
        keywords: { type: "array", items: { type: "string" }, maxItems: 15 },
    },
    required: ["keywords"],
}

let aiAvailability = "unavailable"
let aiSessionPromise = null
let aiController = null
let aiTimer = null

function isAIEnabled() {
    return aiAvailability !== "unavailable"
}

async function checkAI() {
    if (!("LanguageModel" in self)) return

    try {
        aiAvailability = await LanguageModel.availability(LM_OPTIONS)
    } catch (err) {
        console.warn("Prompt API not usable:", err)
        aiAvailability = "unavailable"
    }
    if (!isAIEnabled()) return

    document.body.classList.add("ai-enabled")
    document.getElementById("search").placeholder = "Search or describe an emoji… (fire, fiesta, shipit)"
    document.getElementById("ai-badge").textContent = "✨ AI search"

    // Model already on the device: warm up the session right away.
    if (aiAvailability === "available") getAISession().catch(() => { })
}

function getAISession() {
    // When the model still has to be downloaded, create() needs a user
    // gesture; it is first called shortly after a keystroke in the search box.
    if (!aiSessionPromise) {
        aiSessionPromise = LanguageModel.create({
            ...LM_OPTIONS,
            initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
            monitor(m) {
                m.addEventListener("downloadprogress", e => {
                    setLoadingText(`Downloading AI model… ${Math.round(e.loaded * 100)}%`)
                })
            },
        }).then(session => {
            aiAvailability = "available"
            return session
        }).catch(err => {
            aiSessionPromise = null
            throw err
        })
    }
    return aiSessionPromise
}

function scheduleAISearch(query, exact) {
    aiTimer = setTimeout(() => aiSearch(query, exact), AI_DEBOUNCE_MS)
}

function cancelAI() {
    clearTimeout(aiTimer)
    if (aiController) aiController.abort()
    aiController = null
}

async function aiSearch(query, exact) {
    const controller = new AbortController()
    aiController = controller

    try {
        const base = await getAISession()
        // Clone so every search starts from the system prompt only,
        // without the history of previous searches.
        const session = await base.clone({ signal: controller.signal })
        let raw
        try {
            raw = await session.prompt(query, {
                responseConstraint: KEYWORDS_SCHEMA,
                signal: controller.signal,
            })
        } finally {
            session.destroy()
        }
        if (controller.signal.aborted) return

        const { keywords = [] } = JSON.parse(raw)
        const exactSet = new Set(exact)
        const ai = matchKeywords(keywords).filter(name => !exactSet.has(name))
        render(exact, ai)
    } catch (err) {
        if (err.name === "AbortError") return
        console.error("AI search failed:", err)
        render(exact)
    } finally {
        if (aiController === controller) aiController = null
    }
}

// Turn the model's keywords into real GitHub emoji names, most relevant first.
function matchKeywords(keywords) {
    const terms = [...new Set(
        keywords
            .map(k => String(k).toLowerCase().trim().replace(/^:|:$/g, "").replace(/[\s-]+/g, "_"))
            .filter(Boolean)
    )]

    const scored = []
    for (const name of EMOJI_NAMES) {
        const parts = name.split("_")
        let best = Infinity
        terms.forEach((term, i) => {
            if (name === term) best = Math.min(best, i)
            else if (parts.includes(term) || (term.length >= 4 && name.includes(term)))
                best = Math.min(best, terms.length + i)
        })
        if (best !== Infinity) scored.push([best, name])
    }

    return scored
        .sort((a, b) => a[0] - b[0])
        .slice(0, AI_MAX_RESULTS)
        .map(([, name]) => name)
}
