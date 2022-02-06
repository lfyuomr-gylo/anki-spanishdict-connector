const isOneOf = (value, ...possibleValues) => {
    return possibleValues.findIndex((candidate) => candidate === value) >= 0
}

// TODO: detect the word itself

const findConjugationTables = (document) => {
    // we expect conjugationTables to have the following format
    // <div> <-- grandParent -->
    //  <div class="tenseHeader.*"> <-- firstParentSibling -->
    //    <div class="tenseLabelLink.*"> <-- tenseLabelElem -->
    //      <a>Tense type here</a>
    //    </div>
    //  </div>
    //  <div class="vtableWrapper.*"> <-- parent -->
    //   <table> <-- table -->
    //     <tbody>
    //     </tbody>
    //   </table>
    //  </div>
    // </div>
    const tables = document.getElementsByTagName("table")
    console.log(`Found ${tables.length} tables on the page.`)
    const conjugationTables = []
    for (let idx = 0; idx < tables.length; idx++) {
        const table = tables[idx]
        const logSkip = (reason, ...args) => console.log.apply(this, [`Skip table ${idx} for reason: ${reason}`, ...args])

        const parent = table.parentElement
        if (!parent || parent.tagName !== "DIV" || parent.className.search(/^vtableWrapper.*/g) === -1) {
            logSkip("parent is not a div with /^vtable.*/ class", parent)
            continue
        }

        const grandParent = parent.parentElement
        if (!parent || parent.tagName !== "DIV") {
            logSkip("grandparent is not a div", grandParent)
            continue
        }
        if (grandParent.childElementCount < 2) {
            logSkip(`grandparent has only ${grandParent.childElementCount} children`)
            continue
        }

        const firstParentSibling = grandParent.children[0]
        if (!firstParentSibling || firstParentSibling.tagName !== "DIV" ||
            firstParentSibling.className.search(/^tenseHeader.*/g) === -1) {

            logSkip("parent's first sibling is not a div with /^tenseHeader.*/g class", firstParentSibling)
            continue
        }

        let tenseLabelElem = null
        for (let i = 0; i < firstParentSibling.children.length; i++) {
            const candidate = firstParentSibling.children[i]
            if (candidate.className.search(/^tenseLabelLink.*/g) >= 0) {
                console.log(`found tense label element at index ${i}: `, candidate)
                tenseLabelElem = candidate
                break
            }
        }
        if (!tenseLabelElem) {
            logSkip("parent sibling doesn't have a child with /^tenseLabelLink.*/g class", firstParentSibling.children)
            continue
        }
        const tenseType = tenseLabelElem.textContent
        if (!isOneOf(tenseType, "Indicative", "Subjunctive", "Imperative", "Progressive", "Perfect", "Perfect Subjunctive")) {
            logSkip(`unexpected tense name: "${tenseType}"`, tenseLabelElem)
            continue
        }

        conjugationTables.push({
            tenseClass: tenseType,
            tableElem: table
        })
    }

    return conjugationTables
}

// TODO: parse conjugation tables.

window.onload = function () {
    console.log("Hello from content script!")
    chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
        switch (msg.type) {
            case "EXTRACT_CONJUGATIONS":
                const conjugations = findConjugationTables(document).map(x => x.tenseClass)
                let response = {
                    conjugations
                };
                console.log("Send response to the popup: ", response);
                sendResponse(response);
        }
    })
}