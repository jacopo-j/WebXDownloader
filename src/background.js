// Listener used in the background to execute
// commands passed by parameter from the extension
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        if (request.fetchJson) {
            // Set the header used to fetch the JSON with the
            // parameters passed by the main "process"
            const headers = { headers: { "Accept": "application/json, text/plain, */*" } };
            if (request.password) headers.headers.accessPwd = request.password;
            else headers.headers.appFrom = "pb";

            fetch(request.fetchJson, headers)
                .then(response => response.json())
                .then(response => sendResponse(response))
                .catch(_exception => sendResponse(null));
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
    // Find the detail containing the access password
    const result = details.requestHeaders.filter((e) => e.name === "accessPwd");

    if (result.length > 0) {
        // The password exists
        const password = result[0];

        // Send the password to the the current tab
        const callback = (tabs) => chrome.tabs.sendMessage(tabs[0].id, { recPassword: password.value });
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, callback);
    }
}

chrome.webRequest.onSendHeaders.addListener(
    reqWatcher,
    {urls: ["*://*.webex.com/webappng/api/v1/recordings/*"]},
    ["requestHeaders"]
);
