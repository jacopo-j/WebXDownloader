const REGEX = /^https?:\/\/(.+?)\.webex\.com\/(?:recordingservice|webappng)\/sites\/(.+?)\/recording\/(?:play|playback)\/([a-f0-9]{32})/g;

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
}

function timeCode(absTime) {
    let date = new Date(parseInt(absTime));
    let hour = ("0" + date.getHours()).slice(-2);
    let minute = ("0" + date.getMinutes()).slice(-2);
    let second = ("0" + date.getSeconds()).slice(-2);
    return `${hour}:${minute}:${second}`;
}

function callback(tabs) {
    var url = tabs[0].url;
    let match = REGEX.exec(url);
    if (! match || match.length !== 4) {
        renderFailure();
        return;
    }
    let subdomain = match[1];
    let sitename = match[2];
    let recording_id = match[3];
    fetch(`https://${subdomain}.webex.com/webappng/api/v1/recordings/${recording_id}/stream?siteurl=${sitename}`)
        .then(response => response.json())
        .then(data => {
            let host = data["mp4StreamOption"]["host"];
            let recording_dir = data["mp4StreamOption"]["recordingDir"];
            let timestamp = data["mp4StreamOption"]["timestamp"];
            let token = data["mp4StreamOption"]["token"];
            let xml_name = data["mp4StreamOption"]["xmlName"];
            let playback_option = data["mp4StreamOption"]["playbackOption"];
            let meeting_name = data["recordName"];
            fetch(`${host}/apis/html5-pipeline.do?recordingDir=${recording_dir}&timestamp=${timestamp}&token=${token}&xmlName=${xml_name}&isMobileOrTablet=false&ext=${playback_option}`)
                .then(response => response.text())
                .then(text => (new window.DOMParser()).parseFromString(text, "text/xml"))
                .then(data => {
                    let filename = data.getElementsByTagName("Sequence")[0].textContent;
                    let messages = data.getElementsByTagName("Message");
                    let chat = [];
                    for (let i = 0; i < messages.length; i++) {
                        chat.push({
                            "timecode": timeCode(messages[i].getElementsByTagName("DateTimeUTC")[0].textContent),
                            "name": messages[i].getElementsByTagName("LoginName")[0].textContent,
                            "message": messages[i].getElementsByTagName("Content")[0].textContent
                        });
                    }
                    let hlsUrl = `${host}/hls-vod/recordingDir/${recording_dir}/timestamp/${timestamp}/token/${token}/fileName/${filename}.m3u8`;
                    renderSuccess(meeting_name, hlsUrl, chat);
                })
                .catch(exception => {
                    renderException(exception);
                });
        })
        .catch(exception => {
            renderException(exception);
        });
}

var query = {active: true, currentWindow: true};
chrome.tabs.query(query, callback);
