// ---------- "Try it in a comment" composer ----------

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
