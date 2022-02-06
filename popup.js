const doFetch = ({method, url, queryParams, headers, body}) => {
    if (!method) {
        method = (body === undefined) ? "GET" : "POST"
    }
    if (body !== undefined && typeof body !== "string") {
        body = JSON.stringify(body)
    }

    url = new URL(url)
    if (queryParams) {
        Object.keys(queryParams).forEach(key => url.searchParams.append(key, queryParams[key]))
    }

    return fetch(url, {
        method,
        headers,
        body,
        mode: "no-cors",
    })
}

// Get the current active tab in the lastly focused window
chrome.tabs.query({
    active: true,
    currentWindow: true
}, function (tabs) {
    // and use that tab to fill in out title and url
    const tab = tabs[0];

    const testParagraph = document.getElementById("testParagraph");
    if (tab.url.includes("spanishdict.com/conjugate")) {
        chrome.tabs.sendMessage(tab.id, {type: "EXTRACT_CONJUGATIONS"}, ({conjugations}) => {
            console.log("Received conjugations from the content script:", conjugations)
            testParagraph.textContent += " Found conjugations: " + conjugations.join(", ")
        })
    }

    // call AnkiConnect
    doFetch({
        method: "POST",
        url: "http://localhost:8765",
        headers: {
            "Content-Type": "application/json"
        },
        body: {
            "action": "getNumCardsReviewedToday",
            "version": 6
        }
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

    // obtain word usage examples from spanishdict
    doFetch({
        method: "GET",
        url: "https://examples1.spanishdict.com/explore",
        queryParams: {
            lang: "es",
            q: "leer",
            numExplorationSentences: 100,
        }
    }).then(async (resp) => {
        if (resp.status !== 200) {
            console.info("Got response. Status code: " + resp.status)
            return Promise.reject(new Error(resp.statusText))
        }

        const body = await resp.json();
        console.log("got response from spanishdict", body)
        body.data?.sentences?.forEach((sentence, idx) => {
            if (idx > 0) {
                return
            }

            testParagraph.textContent += "Sample sentence from spanishdict: " + sentence.source;
        })
    }).catch((err) => {
        console.error(err);
    })
});
