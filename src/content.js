const REGEX = /^https?:\/\/(.+?)\.webex\.com\/(?:recordingservice|webappng)\/sites\/(.+?)\/.*([a-f0-9]{32})/g;
const MATCH = REGEX.exec(location.href);
const SUBDOMAIN = MATCH[1];
const SITENAME = MATCH[2];
const RECORDING_ID = MATCH[3];
const API_URL = `https://${SUBDOMAIN}.webex.com/webappng/api/v1/recordings/${RECORDING_ID}/stream?siteurl=${SITENAME}`;
var PASSWORD;
var API_RESPONSE = -1;

var observer = new MutationObserver(function(mutations) {
    if (document.getElementsByClassName('buttonRightContainer').length) { // wait for this

        let loadingText = document.getElementsByClassName("el-loading-text")[0];
        if (loadingText) {
            return; // will try again later
        }

        observer.disconnect();

        var div = document.createElement("div");
        div.setAttribute("class", "buttonItem");

        var i = document.createElement("i");
        i.setAttribute("class", "icon-download");
        i.setAttribute("title", "Download");
        i.setAttribute("id", "downloadButton");
        i.setAttribute("aria-label", "Download");
        i.setAttribute("role", "button");
        div.appendChild(i);

        chrome.runtime.sendMessage(
            {fetchJson: API_URL, password: PASSWORD},
            function(data) {
                API_RESPONSE = data;
                let host = data["mp4StreamOption"]["host"];
                let recording_dir = data["mp4StreamOption"]["recordingDir"];
                let timestamp = data["mp4StreamOption"]["timestamp"];
                let token = data["mp4StreamOption"]["token"];
                let xml_name = data["mp4StreamOption"]["xmlName"];
                let playback_option = data["mp4StreamOption"]["playbackOption"];
                chrome.runtime.sendMessage(
                    {fetchText: `${host}/apis/html5-pipeline.do?recordingDir=${recording_dir}&timestamp=${timestamp}&token=${token}&xmlName=${xml_name}&isMobileOrTablet=false&ext=${playback_option}`},
                    function(text) {
                        let data = (new window.DOMParser()).parseFromString(text, "text/xml");
                        let filename = data.getElementsByTagName("Sequence")[0].textContent;
                        let mp4Url = `${host}/apis/download.do?recordingDir=${recording_dir}&timestamp=${timestamp}&token=${token}&fileName=${filename}`;
                        i.addEventListener("click", function() {
                            window.location = mp4Url;
                        })
                        var buttons = document.getElementsByClassName('buttonRightContainer');
                        buttons[0].prepend(div);
                    }
                )
            }
        )
    }
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.recPassword) {
            PASSWORD = request.recPassword;
        }
        if (request.apiResponse) {
            sendResponse(API_RESPONSE);
        }
    }
);

observer.observe(document.body, {
    childList: true,
    subtree: true
});
