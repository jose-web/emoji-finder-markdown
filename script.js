let EMOJILIST = {}
let EMOJI_NAMES = []
let toastTimer

// ---------- AI (Chrome Prompt API) state ----------
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

window.onload = function () {
    showEmojis()
    checkAI()
    document.getElementById("search").addEventListener("input", find)
    document.getElementById("emojis").addEventListener("click", onEmojiClick)
    document.getElementById("random").addEventListener("click", randomEmoji)
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme)
    initComposer()
    initBackToTop()
}

// ---------- Back to top ----------
function initBackToTop() {
    const button = document.getElementById("to-top")
    const update = () => button.classList.toggle("visible", window.scrollY > 400)
    window.addEventListener("scroll", update, { passive: true })
    update()
    button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }))
}

// ---------- Comment composer ----------
const DEFAULT_DRAFT = "LGTM :shipit: — thanks for the fix :tada:"

function initComposer() {
    const draft = document.getElementById("draft")
    let saved = null
    try { saved = localStorage.getItem("draft") } catch (e) { }
    setDraft(saved ?? DEFAULT_DRAFT)

    draft.addEventListener("input", saveDraft)
    document.getElementById("tab-write").addEventListener("click", () => showTab("write"))
    document.getElementById("tab-preview").addEventListener("click", () => showTab("preview"))
    document.getElementById("reset-draft").addEventListener("click", () => {
        setDraft(DEFAULT_DRAFT)
        saveDraft()
    })
    document.getElementById("copy-draft").addEventListener("click", () => {
        navigator.clipboard.writeText(draft.value)
            .then(() => showToast("Copied comment markdown"))
            .catch(() => showToast("Could not copy", true))
    })
}

// Replace the whole draft and leave the caret at the end, so the next
// emoji added from the grid goes after the existing text.
function setDraft(text) {
    const draft = document.getElementById("draft")
    draft.value = text
    draft.setSelectionRange(text.length, text.length)
    renderPreview()
}

function saveDraft() {
    try { localStorage.setItem("draft", document.getElementById("draft").value) } catch (e) { }
    renderPreview()
}

function showTab(tab) {
    const isWrite = tab === "write"
    document.getElementById("draft").hidden = !isWrite
    document.getElementById("preview").hidden = isWrite
    for (const [id, on] of [["tab-write", isWrite], ["tab-preview", !isWrite]]) {
        const button = document.getElementById(id)
        button.classList.toggle("active", on)
        button.setAttribute("aria-selected", on)
    }
    renderPreview()
}

// Preview: shortcodes become GitHub emoji images; everything else is plain text.
function renderPreview() {
    const preview = document.getElementById("preview")
    if (preview.hidden) return
    const text = document.getElementById("draft").value
    if (!text.trim()) {
        preview.innerHTML = `<span class="placeholder">Nothing to preview</span>`
        return
    }
    preview.innerHTML = escapeHTML(text)
        .replace(/:([a-z0-9_+\-]+):/g, (match, name) => EMOJILIST[name]
            ? `<img class="inline-emoji" src="${EMOJILIST[name]}" alt="${match}" title="${match}">`
            : match)
        .replace(/\n/g, "<br>")
}

// Insert the shortcode at the caret (or over the selection) of the draft.
function insertEmoji(card) {
    const code = `:${card.dataset.name}:`
    const draft = document.getElementById("draft")
    const before = draft.value.slice(0, draft.selectionStart)
    const after = draft.value.slice(draft.selectionEnd)
    const pre = before && !/\s$/.test(before) ? " " : ""
    const post = after && !/^\s/.test(after) ? " " : ""

    draft.value = before + pre + code + post + after
    const caret = (before + pre + code + post).length
    draft.setSelectionRange(caret, caret)
    saveDraft()

    flashCard(card, "inserted")
    showToast(`Added ${code} to the comment`)
}

function flashCard(card, className) {
    card.classList.remove("copied", "inserted")
    card.classList.add(className)
    setTimeout(() => card.classList.remove(className), 1000)
}

// ---------- Theme ----------
function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light"
    document.documentElement.dataset.theme = next
    try { localStorage.setItem("theme", next) } catch (e) { }
}

function randomEmoji() {
    if (!EMOJI_NAMES.length) return
    const search = document.getElementById("search")
    search.value = EMOJI_NAMES[Math.floor(Math.random() * EMOJI_NAMES.length)]
    search.dispatchEvent(new Event("input"))
}

function escapeHTML(text) {
    return text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
}

// ---------- Data ----------
function showEmojis() {
    fetch("https://api.github.com/emojis", {
        method: 'GET',
    }).then(res => res.json())
        .then(res => {
            EMOJILIST = res
            EMOJI_NAMES = Object.keys(res)
            render(EMOJI_NAMES)
            renderPreview()
        })
        .catch(error => {
            console.error('Error:', error)
            document.getElementById("count").textContent = "Could not load emojis"
        })
}

// ---------- Rendering ----------
function card(name, isAI = false) {
    return `
        <div class="emoji${isAI ? " ai" : ""}" data-name="${name}" title="Click to copy :${name}:">
            <img src="${EMOJILIST[name]}" alt="${name}" loading="lazy">
            <p>:${name}:</p>
            <div class="emoji-actions">
                <button type="button" data-action="copy" title="Copy" aria-label="Copy :${name}:">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>
                </button>
                <button type="button" data-action="insert" title="Add to comment" aria-label="Add :${name}: to the comment">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
            </div>
        </div>`
}

function render(exact, ai = [], pending = false) {
    const total = EMOJI_NAMES.length
    const query = document.getElementById("search").value.trim()
    let count = exact.length === total ? `${total} emojis` : `${exact.length} of ${total} emojis`
    if (ai.length) count += ` · ${ai.length} from AI`
    document.getElementById("count").textContent = count

    const container = document.getElementById("emojis")

    const loader = pending
        ? `<div class="ai-loading"><span class="spinner"></span><span id="ai-loading-text">Searching with AI…</span></div>`
        : ""

    if (exact.length === 0 && ai.length === 0) {
        container.innerHTML = pending
            ? loader
            : `<div class="empty">
                   <strong>No emojis match “${escapeHTML(query)}”</strong>
                   <span>Try another word${aiAvailability !== "unavailable" ? ", in English or Spanish" : ""}.</span>
               </div>`
        return
    }

    let html = exact.map(name => card(name)).join("")
    if (ai.length) {
        html += `<h2 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>
            </svg>
            Suggested by AI</h2>`
        html += ai.map(name => card(name, true)).join("")
    }
    container.innerHTML = html + loader
}

// ---------- Search ----------
function find(event) {
    const query = event.target.value.trim().toLowerCase()
    const exact = EMOJI_NAMES.filter(emoji => emoji.includes(query))

    cancelAI()
    const useAI = aiAvailability !== "unavailable" && query.length >= AI_MIN_QUERY
    render(exact, [], useAI)

    if (useAI) {
        aiTimer = setTimeout(() => aiSearch(query, exact), AI_DEBOUNCE_MS)
    }
}

// ---------- AI search ----------
async function checkAI() {
    if (!("LanguageModel" in self)) return

    try {
        aiAvailability = await LanguageModel.availability(LM_OPTIONS)
    } catch (err) {
        console.warn("Prompt API not usable:", err)
        aiAvailability = "unavailable"
    }
    if (aiAvailability === "unavailable") return

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

function setLoadingText(text) {
    const el = document.getElementById("ai-loading-text")
    if (el) el.textContent = text
}

// ---------- Copy ----------
// Card click (or its copy button) copies; the "+" button adds to the comment.
function onEmojiClick(event) {
    const card = event.target.closest(".emoji")
    if (!card) return
    const action = event.target.closest("[data-action]")?.dataset.action
    if (action === "insert") insertEmoji(card)
    else copyEmoji(card)
}

function copyEmoji(card) {
    const code = `:${card.dataset.name}:`
    navigator.clipboard.writeText(code)
        .then(() => {
            flashCard(card, "copied")
            showToast(`Copied ${code} to clipboard`)
        })
        .catch(() => showToast("Could not copy", true))
}

function showToast(message, isError = false) {
    const toast = document.getElementById("toast")
    document.getElementById("toast-text").textContent = message
    toast.classList.toggle("error", isError)
    toast.classList.add("show")
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800)
}
