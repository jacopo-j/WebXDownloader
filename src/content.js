const REGEX = /^https?:\/\/(.+?)\.webex\.com\/(?:recordingservice|webappng)\/sites\/([^\/]+)\/.*?([a-f0-9]{32})[^\?]*(\?.*)?/g;
const MATCH = REGEX.exec(location.href);
const SUBDOMAIN = MATCH[1];
const SITENAME = MATCH[2];
const RECORDING_ID = MATCH[3];
const AUTH_PARAMS = MATCH[4];
var API_URL = `https://${SUBDOMAIN}.webex.com/webappng/api/v1/recordings/${RECORDING_ID}/stream`;
var PASSWORD;
var API_RESPONSE = -1;

if (AUTH_PARAMS) API_URL += AUTH_PARAMS;

/**
 * Create the download button to add to the Webex video viewer.
 * @param {string} downloadURL URL of the video to download.
 * @param {string} savepath Path where save the recording.
 */
function createDownloadButton(downloadURL, savepath) {
    // Create the button "container"
    const btn = document.createElement("button");
    btn.setAttribute("id", "downloadButton")
    btn.setAttribute("class", "vjs-download-button vjs-control vjs-button");
    btn.setAttribute("aria-disabled", "false");
    btn.setAttribute("type", "button");
    btn.title = 'Download Recording'

    const span = document.createElement("span");
    span.setAttribute("class", "vjs-icon-placeholder")
    span.setAttribute("aria-hidden", "true")

    const span2 = document.createElement("span");
    span2.setAttribute("class", "vjs-control-text")
    span2.setAttribute("aria-live", "polite")
    span2.innerHTML = 'Download Recording'

    // Add the onClick event
    const downloadMessage = {
        downloadURL: downloadURL,
        savepath: savepath
    };
    btn.addEventListener("click", () => chrome.runtime.sendMessage(downloadMessage));

    btn.appendChild(span);
    btn.appendChild(span2);

    return btn;
}

/**
 * Create the download button to add to the old Webex video viewer.
 * @param {string} downloadURL URL of the video to download.
 * @param {string} savepath Path where save the recording.
 */
function createDownloadButtonOld(downloadURL, savepath) {
    // Create the button "container"
    const div = document.createElement("div");
    div.setAttribute("class", "buttonItem");

    // Create the button
    const i = document.createElement("i");
    i.setAttribute("class", "icon-download");
    i.setAttribute("title", "Download");
    i.setAttribute("id", "downloadButton");
    i.setAttribute("aria-label", "Download");
    i.setAttribute("role", "button");

    // Add the onClick event
    const downloadMessage = {
        downloadURL: downloadURL,
        savepath: savepath
    };
    i.addEventListener("click", () => chrome.runtime.sendMessage(downloadMessage));

    div.appendChild(i);

    return div;
}

/**
 * Process a JSON-formatted response obtained from a WebEx page.
 */
function parseParametersFromResponse(response) {
    // Alias used to centralize response values
    const streamOption = response["mp4StreamOption"];

    // get the new endpoint that can be (ab)used to download the video
    // It's very fast if Multi-threading download is supported (for example with aria2c downloader), but for now does not work on browsers
    // On Chrome it's possible to enable it going to chrome://flags/#enable-parallel-downloading
    const fallbackPlaySrc = response['fallbackPlaySrc']

    // Get the data we need to get the video stream
    const host = streamOption["host"];
    const recordingDir = streamOption["recordingDir"];
    const timestamp = streamOption["timestamp"];
    const token = streamOption["token"];
    const xmlName = streamOption["xmlName"];
    const playbackOption = streamOption["playbackOption"];

    // Get the name of the recording
    const recordName = response["recordName"];

    return {
        host,
        recordingDir,
        timestamp,
        token,
        xmlName,
        playbackOption,
        recordName,
        fallbackPlaySrc
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

function composeDownloadURL(params, filename) {
    const url = new URL("apis/download.do", params.host);
    url.searchParams.set("recordingDir", params.recordingDir);
    url.searchParams.set("timestamp", params.timestamp);
    url.searchParams.set("token", params.token);
    url.searchParams.set("fileName", filename);

    //return params.fallbackPlaySrc
    return url;
}

function sanitizeFilename(filename) {
    const allowedChars = /[^\w\s\d\-_~,;\[\]\(\).]/g;
    return filename.replaceAll(allowedChars, "_");
}

/**
 * Callback used by a MutationObserver object in a
 * WebEx page containing a registration to download.
 */
function mutationCallback(_mutationArray, observer) {
    // Check if the change is the one we want and if the loading text is available.
    // Otherwise it returns (fast fail)
    const buttons = document.getElementsByClassName('vjs-control-bar'); // Buttons on the viewer bar
    const buttonsOld = document.getElementsByClassName('buttonRightContainer');
    const loadingText = document.getElementsByClassName("el-loading-text")[0];
    if ((!buttons.length && !buttonsOld.length) || loadingText) return;

    chrome.runtime.sendMessage({
            fetchJson: API_URL,
            password: PASSWORD
        },
        (response) => {
            // Save the response from the page
            API_RESPONSE = response;

            // Disconnect this observer to avoid
            // triggering the DOM change detection event
            observer.disconnect();

            // Get the useful parameters from the received response
            const params = parseParametersFromResponse(response);

            // Compose the URL from which to get the video stream to download
            const streamURL = composeStreamURL(params);

            // Add the download button
            chrome.runtime.sendMessage({
                    fetchText: streamURL.toString()
                },
                (text) => addDownloadButtonToViewer(text, params));
        }
    )
}

/**
 * Add the download button to the video viewer bar.
 * @param {string} text
 */
function addDownloadButtonToViewer(text, params) {

    const downloadButton_dom = document.getElementById("downloadButton")
    if(downloadButton_dom) return

    // Extract the filename of the video
    const parser = new window.DOMParser();
    const data = parser.parseFromString(text, "text/xml");
    const filename = data.getElementsByTagName("Sequence")[0].textContent;

    // Set the recording name as the save name
    const savename = `${sanitizeFilename(params.recordName)}.mp4`;

    // Compose the download link of the video
    const downloadURL = composeDownloadURL(params, filename);

    // Get the buttons on the viewer bar and add the download button
    const spacer = document.getElementsByClassName('vjs-custom-control-spacer vjs-spacer')[0];
    if(spacer) {
        const downloadButton = createDownloadButton(downloadURL.toString(), savename);
        spacer.parentNode.insertBefore(downloadButton, spacer.nextSibling);
    } else {
        const buttons = document.getElementsByClassName('buttonRightContainer');
        if(buttons) {
            const downloadButton = createDownloadButtonOld(downloadURL.toString(), savename);
            buttons[0].prepend(downloadButton);
        }
    }

};

// Add a listener used to receive the password for the WebEx account
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.recPassword) PASSWORD = request.recPassword;
    if (request.apiResponse) sendResponse(API_RESPONSE);
});

// Create an observer for the DOM
const observer = new MutationObserver(mutationCallback);

observer.observe(document.body, {
    childList: true,
    subtree: true
});
