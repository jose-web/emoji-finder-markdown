// ---------- Emoji card actions ----------

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
