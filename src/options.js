function saveOptions() {
  chrome.storage.local.set({
    hideprotip: document.getElementById("hide-protip").checked
  });
}

function restoreOptions() {

  function setCurrentChoice(result) {
    if (! result.hideprotip && document.getElementById("errpage").style.display === "none") {
        document.getElementById("protip").style.display = "block";
    }
  }

  chrome.storage.local.get("hideprotip", setCurrentChoice);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("hide-protip").addEventListener("click", saveOptions);
