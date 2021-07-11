window.onload = function () {
    showEmojis()
}

function showEmojis() {
    fetch("https://api.github.com/emojis", {
        method: 'GET',
    }).then(res => res.json())
        .catch(error => console.error('Error:', error))
        .then(res => {
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