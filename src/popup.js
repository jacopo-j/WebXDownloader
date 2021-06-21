const REGEX = /^https?:\/\/(.+?)\.webex\.com\/(?:recordingservice|webappng)\/sites\/([^\/]+)\/.*?([a-f0-9]{32})/g;
const UPDATE_URL = "https://api.github.com/repos/jacopo-j/webxdownloader/releases/latest";

function copyLink() {
    let text = document.getElementById("content");
    text.disabled = false;
    text.select();
    document.execCommand("copy");
    text.blur();
    text.disabled = true;
}

function downloadChat() {
    let download = document.getElementById("download");
    let link = document.createElement("a");
    let title = document.getElementById("content").dataset.title;
    if (document.getElementById("chat-opt").checked) {
        link.download = `${title}_chat.txt`;
        let chatData = JSON.parse(download.dataset.content);
        let out = [];
        for (let i = 0; i < chatData.length; i++) {
            let m = chatData[i];
            out.push(`${m.timecode} - ${m.name}\n${m.message}`);
        }
        let file = out.join("\n\n") + "\n";
        link.href = `data:application/octet-stream;charset=utf-8,${encodeURIComponent(file)}`;
    } else if (document.getElementById("json-opt").checked) {
        link.download = `${title}_chat.json`;
        link.href = `data:application/octet-stream;charset=utf-8,${encodeURIComponent(download.dataset.content)}`;
    }
    link.click();
    if (navigator.userAgent.indexOf("Safari") > -1) {
        chrome.runtime.sendMessage({safariOpenUrl: link.href})
    }
}

function renderSuccess(title, url, chat) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("success").style.display = "block";
    document.getElementById("content").innerText = url;
    document.getElementById("content").dataset.content = url;
    document.getElementById("content").dataset.title = title;
    document.getElementById("copy").onclick = copyLink;
    if (chat.length > 0) {
        document.getElementById("chat").style.display = "block";
        document.getElementById("download").dataset.content = JSON.stringify(chat);
        document.getElementById("download").onclick = downloadChat;
    }
}

function renderFailure() {
    document.getElementById("loading").style.display = "none";
    document.getElementById("errpage").style.display = "block";
}

function renderException(exception) {
    document.body.classList.add("fail");
    document.getElementById("loading").style.display = "none";
    document.getElementById("fail").style.display = "block";
    document.getElementById("error-message").textContent = exception.message;
}

/**
 * Check for updates for this extension.
 */
function checkUpdates() {
    fetch(UPDATE_URL)
        .then(response => response.json())
        .then(data => {
            // Get latest and current version for the extension
            const latestVersion = data.tag_name;
            const currentVersion = chrome.runtime.getManifest().version;

            if (latestVersion && latestVersion != currentVersion) {
                // Show update link if update is available
                document.getElementById("updates-available").style.display = "block";

                // Open update link in safari browser
                if (navigator.userAgent.indexOf("Safari") > -1) {
                    const updateButton = document.getElementById("updates-link");
                    updateButton.addEventListener("click", (_event) => {
                        const url = document.getElementById("updates-link").getAttribute("href");
                        chrome.runtime.sendMessage({ safariOpenUrl: url });
                    });
                }
            }
        })
}

/**
 * Given a time value in absolute number of seconds,
 * it returns a string in the format `HH:mm:ss`.
 * @param {number} absTime
 */
function timeCode(absTime) {
    const date = new Date(parseInt(absTime));
    const hour = ("0" + date.getHours()).slice(-2);
    const minute = ("0" + date.getMinutes()).slice(-2);
    const second = ("0" + date.getSeconds()).slice(-2);
    return `${hour}:${minute}:${second}`;
}

/**
 * Process a JSON-formatted response obtained from a WebEx page.
 */
function parseParametersFromResponse(response) {
    // Alias used to centralize response values
    const streamOption = response["mp4StreamOption"];

    // Get the data we need to get the video stream
    const host = streamOption["host"];
    const recordingDir = streamOption["recordingDir"];
    const timestamp = streamOption["timestamp"];
    const token = streamOption["token"];
    const xmlName = streamOption["xmlName"];
    const playbackOption = streamOption["playbackOption"];

    return {
        host,
        recordingDir,
        timestamp,
        token,
        xmlName,
        playbackOption
    }
}

function composeStreamURL(params) {
    const url = new URL("apis/html5-pipeline.do", params.host);
    url.searchParams.set("recordingDir", params.recordingDir);
    url.searchParams.set("timestamp", params.timestamp);
    url.searchParams.set("token", params.token);
    url.searchParams.set("xmlName", params.xmlName);
    url.searchParams.set("isMobileOrTablet", "false");
    url.searchParams.set("ext", params.playbackOption);

    return url;
}

function checkResponseForErrors(response) {
    let validResponse = true;

    if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError);
        renderFailure();
        validResponse = false;
    }

    if (response == -1) {
        renderFailure();
        validResponse = false;
    } else if (!response) {
        renderException(new Error("Received null response"));
        validResponse = false;
    }

    return validResponse;
}

function isThisAWebExPage(url) {
    const match = REGEX.exec(url);
    if (!match) renderFailure();
    return match !== null;
}

function callback(tabs) {
    // Check for extension update
    checkUpdates();

    // Check if this URL is of a WebEx page
    if(!isThisAWebExPage(tabs[0].url)) return;
    
    chrome.tabs.sendMessage(tabs[0].id, {
                apiResponse: true
            }, (response) => {
        // Check if the response is valid
        if(!checkResponseForErrors(response)) return;
        
        // Get the useful parameters from the received response
        const params = parseParametersFromResponse(response);

        // Compose the URL from which to get the video stream to download
        const streamURL = composeStreamURL(params);
        
        fetch(streamURL.toString())
            .then(response => response.text())
            .then(text => (new window.DOMParser()).parseFromString(text, "text/xml"))
            .then(data => {
                // Convert from HTMLCollection to array
                const messages = [...data.getElementsByTagName("Message")];

                // Parse the messages in the chat
                const chat = messages.map((message) => {
                    // First get the HTML Elements
                    const datetimeElement = message.getElementsByTagName("DateTimeUTC");
                    const nameElement = message.getElementsByTagName("LoginName");
                    const messageElement = message.getElementsByTagName("Content");

                    // Check the existence of the data
                    return {
                        "timecode": datetimeElement.length > 0 ? timeCode(datetimeElement[0].textContent) : "00:00:00",
                        "name": nameElement.length > 0 ? nameElement[0].textContent : "Name unavailable",
                        "message": messageElement.length > 0 ? messageElement[0].textContent : "Message unavailable",
                    };
                });

                // Compse the captions URL
                const filename = data.getElementsByTagName("Sequence")[0].textContent;
                const meetingName = response["recordName"];
                const hlsUrl = `${params.host}/hls-vod/recordingDir/${params.recordingDir}/timestamp/${params.timestamp}/token/${params.token}/fileName/${filename}.m3u8`;
                renderSuccess(meetingName, hlsUrl, chat);
            })
            .catch(ex => renderException(ex));
    });
}

// Get the currently focused tab
const query = { active: true, currentWindow: true };
chrome.tabs.query(query, callback);
