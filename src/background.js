chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.fetchJson) {
            fetch(request.fetchJson, {headers: {"appFrom": "pb"}})
                .then(response => response.json())
                .then(response => sendResponse(response));
            return true;
        }
        if (request.fetchText) {
            fetch(request.fetchText)
                .then(response => response.text())
                .then(response => sendResponse(response));
            return true;
        }
    }
)