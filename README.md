# Customized Innovaphone WebRTC demo

[Innovaphone](https://innovaphone.com) offers a JS-Library to connect to their PBX and use it as a WebRTC Backend.
This repo is for testing, proof of concept and adding features or themes.

# Motivation, Goals

The motivation behind this repo is to build knowledge in regards to the Innovaphone WebRTC API/Library and demonstrate it's usefulness, and to create a place that serves as a showcase for workmates and clients.

The end-goal is to write a wrapper or rewrite the provided businesscard / sidebar js to make it modern and more useful.

# Themes
Themes can be applied by loading the custom stylesheet after all the other stylesheets.
Doing so will overwrite selectors if specified in the custom stylesheet, otherwise the default style will be applied.

Themes can be found in `/webrtc/css`

A Live-Demo can be found here: [https://webrtc.persk.es](https://webrtc.persk.es) -> no longer available

### How to: Use a specific theme

1. locate the desired theme in the `webrtc/css` folder
2. locate the line `<link id="customTheme" rel="stylesheet" href="/css/businessCards-material.css">`
3. change the "href" part to the desired theme name you chose in step 1
4. make sure you add the `link` AFTER all other css imports (all other `link` tags)

### Available Themes
 - Default Theme - provided by Innovaphone
 - BYES - A [Bouygues E&S InTec](https://www.bouygues-es-intec.ch/) inspired theme (not official by any means!)
 - Material - A theme inspired by googles "material design" that visibly shaped the web.
 - Minimal - A minimal almost-black and almost-white theme
...



# Demo

### Demo of the themes

<img src="https://github.com/perskes/inno-webrtc/blob/master/webrtc/screenshots/webrtc_themes.gif?raw=true">

### Demo of the working WebRTC Example
<img src="https://github.com/perskes/inno-webrtc/blob/master/webrtc/screenshots/screencap1.gif?raw=true">
