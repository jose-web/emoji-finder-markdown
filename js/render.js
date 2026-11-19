// ---------- Emoji grid rendering ----------

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

// exact: local matches; ai: AI suggestions; pending: AI search in progress.
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
                   <span>Try another word${isAIEnabled() ? ", in English or Spanish" : ""}.</span>
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

function setLoadingText(text) {
    const el = document.getElementById("ai-loading-text")
    if (el) el.textContent = text
}
