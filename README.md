# WebXDownloader

This is a browser extension that helps downloading Webex meeting recordings. It adds a button to the video playback controls that enables downloading of the recording in mp4 format. It also provides the direct URL to the HSL stream and allows the chat transcript to be saved in JSON or plain text format.

![demo](demo.gif)

## Installation

### Firefox (recommended)

Download the `.xpi` file from the [latest release](https://github.com/jacopo-j/WebXDownloader/releases) and drag it to any Firefox window to install.

### Google Chrome

* Download the `.zip` file from the [latest release](https://github.com/jacopo-j/WebXDownloader/releases)
* Extract the zip file
* Browse to `chrome://extensions`
* Turn on "Developer mode" on the top right
* Click "Load unpacked extension..." on the top left
* Select the folder named `src` from the folder to which your zip file was extracted.

### Safari (experimental)

1. Download the `.dmg` file from the [latest release](https://github.com/jacopo-j/WebXDownloader/releases)
2. Mount the disk image by double clicking it
3. Drag the WebXDownloader app to your Applications folder
4. Open the app once (right click > open)
5. Open Safari > Preferences > Extensions and enable WebXDownloader

## Usage

Just browse to the meeting recording page and you will find a download button on the right side of the playback control bar. If you want to copy the HLS stream URL or download the chat transcript, launch the extension from your browser.
