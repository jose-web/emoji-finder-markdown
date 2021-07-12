let EMOJILIST

window.onload = function () {
    showEmojis()
    document.getElementById("search").addEventListener("keyup", find)
}

function showEmojis() {
    fetch("https://api.github.com/emojis", {
        method: 'GET',
    }).then(res => res.json())
        .catch(error => console.error('Error:', error))
        .then(res => {
            EMOJILIST = res
            let emojis = ""
            for (let emoji in res) {
                emojis += `
                <div class="emoji">
                    <img src="${res[emoji]}" alt="${emoji}" loading="lazy">
                    <p>:${emoji}:</p>
                </div>
                `}
            document.getElementById("emojis").innerHTML = emojis
        })
}

function find(event) {
    let emojis = ""

    for (let emoji in EMOJILIST) {
        let ExpReg = new RegExp("" + event.target.value + "", "g")

        if (emoji.match(ExpReg))
            emojis += `
        <div class="emoji">
            <img src="${EMOJILIST[emoji]}" alt="${emoji}" loading="lazy">
            <p>:${emoji}:</p>
        </div>
        `}

    if (emojis == "")
        emojis = "no matches"

    document.getElementById("emojis").innerHTML = emojis
}