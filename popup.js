// Get the current active tab in the lastly focused window
chrome.tabs.query({
    active: true,
    currentWindow: true
}, function (tabs) {
    // and use that tab to fill in out title and url
    var tab = tabs[0];

    let testParagraph = document.getElementById("testParagraph");
    if (tab.url.includes("spanishdict.com")) {
        testParagraph.textContent += "This is spanishdict.com: yes. ";
    }
    testParagraph.textContent += "Tab title: '" + tab.title + "'.";
});
