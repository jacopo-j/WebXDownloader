const REGEX = /^https?:\/\/(.+?)\.webex\.com\/(?:recordingservice|webappng)\/sites\/(.+?)\/.*([a-f0-9]{32})/g;

var observer = new MutationObserver(function(mutations) {
    if (document.getElementsByClassName('buttonRightContainer').length) { // wait for this

        let loadingText = document.getElementsByClassName("el-loading-text")[0];
        if (loadingText && loadingText.contains("The recording is being decrypted")) {
            return; // will try again later
        }

        observer.disconnect(); //We can disconnect observer once the element exist if we dont want observe more changes in the DOM

        var div = document.createElement("div");
        div.setAttribute("class", "buttonItem");

        var i = document.createElement("i");
        i.setAttribute("class", "icon-download")
        i.setAttribute("title", "Download");
        i.setAttribute("aria-label", "Download")
        i.setAttribute("role", "button")
        div.appendChild(i)

        var buttons = document.getElementsByClassName('buttonRightContainer');
        buttons[0].prepend(div);

        let match = REGEX.exec(location.href);
        let subdomain = match[1];
        let sitename = match[2];
        let recording_id = match[3];;
        chrome.runtime.sendMessage(
            {fetchJson: `https://${subdomain}.webex.com/webappng/api/v1/recordings/${recording_id}/stream?siteurl=${sitename}`},
            function(data) {
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
                    }
                )
            }
        )
    }
});

// Start observing
observer.observe(document.body, { //document.body is node target to observe
    childList: true,
    subtree: true
});
