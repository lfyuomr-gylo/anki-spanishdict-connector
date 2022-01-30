// Get the current active tab in the lastly focused window
chrome.tabs.query({
    active: true,
    currentWindow: true
}, function (tabs) {
    // and use that tab to fill in out title and url
    const tab = tabs[0];

    const testParagraph = document.getElementById("testParagraph");
    if (tab.url.includes("spanishdict.com")) {
        testParagraph.textContent += "This is spanishdict.com: yes. ";
    }
    // testParagraph.textContent += "Tab title: '" + tab.title + "'.";

    // call AnkiConnect
    fetch("http://localhost:8765", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "action": "getNumCardsReviewedToday",
            "version": 6
        })
    }).then(async (resp) => {
        if (resp.status !== 200) {
            return Promise.reject(new Error(resp.statusText))
        }
        const body = await resp.json()
        if (body.error) {
            return Promise.reject(new Error(body.error))
        }

        testParagraph.textContent += "Anki Request status: " + resp.status + ". "
        testParagraph.textContent += "Cards reviewed today in Anki: " + body.result + "."
    }).catch(function (err) {
        console.error(err)
    })
});
