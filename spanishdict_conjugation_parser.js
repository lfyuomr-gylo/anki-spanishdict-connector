const isOneOf = (value, ...possibleValues) => {
    return possibleValues.findIndex((candidate) => candidate === value) >= 0
}

// TODO: detect the word itself

const findConjugationTables = (document) => {
    // we expect verb conjugation to be presented in the following format:
    // <div> <-- grandParent -->
    //  <div class="tenseHeader.*"> <-- firstParentSibling -->
    //    <div class="tenseLabelLink.*"> <-- tenseLabelElem -->
    //      <a>Tense type here</a>
    //    </div>
    //  </div>
    //  <div class="vtableWrapper.*"> <-- parent -->
    //   <table> <-- table -->
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
            tableElem: table,
        })
    }

    return conjugationTables
}

const parseConjugationTableOrNull = (table) => {
    // Conjugation table is expected to have the following format:
    // <table>
    //   <tbody>
    //     <tbody>
    //       <tr>
    //         <td><-- empty --></td>
    //         <td>TenseName1</td>
    //         <-- ... more tenses ... -->
    //       </tr>
    //       <tr>
    //         <td>Yo</td>
    //         <td>verb conjugated in the first tense with pronoun yo</td>
    //         <-- ... more tenses ... -->
    //       </tr>
    //       <-- ... more forms ... -->
    //     </tbody>
    //   </tbody>
    // </table>

    if (table.children.length < 1 || table.children[0].tagName !== "TBODY") {
        console.log("Table's first child is not a tbody:", table)
        return null
    }
    const tbody = table.children[0]
    const lines = []
    for (let lineIdx = 0; lineIdx < tbody.children; lineIdx++) {
        const tr = tbody.children[lineIdx]
        if (tr.tagName !== "TR") {
            console.warn("Unexpected tag inside tbody! Expected tr but got: ", tr)
            return null
        }

        const line = []
        for (let colIdx = 0; colIdx < tr.children.length; colIdx++) {
            const td = tr.children[colIdx]
            if (td.tagName !== "TD") {
                console.warn("Unexpected tag inside tr! Expected td, but got: ", td)
                return null
            }
            // TODO: td actually contains a deeply nested <a> tag that links to the examples with right meaning
            //       we'd better extract that URL here
            line.push(td.textContent)
        }
        lines.push(line)
    }

    console.log("Parsed conjugation table: ", lines)
    if (lines.length < 1) {
        console.warn("Conjugation table has no lines! Skip it")
        return null
    }

    // TODO: check if it works
    const conjugations = [] // { tense: "Present", pronoun: "yo", word: "leo" }
    for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
        const pronoun = lines[lineIdx][0]
        for (let colIdx = 1; colIdx < lines[lineIdx].length; colIdx++) {
            const tense = lines[0][colIdx]
            const word = lines[lineIdx][colIdx]
            conjugations.push({tense, pronoun, word})
        }
    }
    return conjugations
}

window.onload = function () {
    console.log("Hello from content script!")
    chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
        switch (msg.type) {
            case "EXTRACT_CONJUGATIONS":
                const conjugations = findConjugationTables(document).map(x => x.tenseClass)
                // TODO: parse conjugations and return full result
                let response = {
                    conjugations
                };
                console.log("Send response to the popup: ", response);
                sendResponse(response);
        }
    })
}