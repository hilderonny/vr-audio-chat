# vr-audio-chat
Simple NodeJS / AFRAME solution for virtual reality audio chats in a local network.

The ```audio.html``` file shows a textual example of multiply connected clients. For each client a line is shown.When the client talks, you can hear it and in its line "true" is written.

The ```index.html``` file is an extended 3D version with the same basic functionality. For each client a purple ball is displayed in 3D space. When the client talks, its corresponding ball turns green and you can hear him. When he stops talking, it turns purple again.

## 2018-03-20

Currently AFRAME does not work on Android devices under Chrome 65. The device motion events are not handled. Currently one must use the Samsung browser (when you have a Samsung device).
