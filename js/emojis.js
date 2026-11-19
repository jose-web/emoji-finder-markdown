// ---------- Emoji data (GitHub API) ----------

let EMOJILIST = {}      // name -> image URL
let EMOJI_NAMES = []

function loadEmojis() {
    fetch("https://api.github.com/emojis")
        .then(res => res.json())
        .then(res => {
            EMOJILIST = res
            EMOJI_NAMES = Object.keys(res)
            render(EMOJI_NAMES)
            renderPreview()
            initTranslations()
        })
        .catch(error => {
            console.error('Error:', error)
            document.getElementById("count").textContent = "Could not load emojis"
        })
}
