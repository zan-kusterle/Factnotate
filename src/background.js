/* globals chrome, ROOT_URL */

chrome.browserAction.onClicked.addListener(tab => {
    chrome.tabs.create({ url: `${ROOT_URL}/t/${encodeURIComponent(tab.url)}` })
})

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'factnotate',
        title: 'Annotate with Factnotate',
        contexts: ['selection'],
    }, () => {
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'factnotate') {
                const text = info.selectionText.trim()
                chrome.tabs.create({ url: `${ROOT_URL}/t/${encodeURIComponent(tab.url)}/${encodeURIComponent(text)}` })
            }
        })
    })
})
