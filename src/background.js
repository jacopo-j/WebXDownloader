chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.fetchJson) {
            let headers = {headers: {"Accept": "application/json, text/plain, */*"}};
            if (request.password) {
                headers.headers.accessPwd = request.password;
            } else {
                headers.headers.appFrom = "pb";
            }
            fetch(request.fetchJson, headers)
                .then(response => response.json())
                .then(response => sendResponse(response))
                .catch(exception => {
                    sendResponse(null);
                });
            return true;
        }
        if (request.fetchText) {
            fetch(request.fetchText)
                .then(response => response.text())
                .then(response => sendResponse(response));
            return true;
        }
        if (request.safariOpenUrl) {
            chrome.tabs.create({url: request.safariOpenUrl});
        }
    }
);

function reqWatcher(details) {
    for (let i = 0; i < details.requestHeaders.length; i++) {
        if (details.requestHeaders[i].name == "accessPwd") {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    recPassword: details.requestHeaders[i].value
                });
            });
            return;
        }
    }
}

chrome.webRequest.onSendHeaders.addListener(
    reqWatcher,
    {urls: ["*://*.webex.com/webappng/api/v1/recordings/*"]},
    ["requestHeaders"]
);
