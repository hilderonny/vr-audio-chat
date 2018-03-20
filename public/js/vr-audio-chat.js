
var videowall = {
    rtc: null,
    clients: {},
    videolisttag: null,
    localvideotag: document.createElement("video"),
    // Called when the page is loaded and a list of already connected clients is fetched
    onclientlist: function(clientlist) {
        videowall.clients = clientlist;
    },
    // Called when a new remote client connects
    onclientconnected: function(client) {
        videowall.clients[client.id] = client;
    },
    // Called when a remote client disconnected
    onclientdisconnected: function(client) {
        client.videotag.pause();
        client.videotag.src = "";
        client.videotag.parentNode.removeChild(client.videotag);
        delete videowall.clients[client.id];
    },
    // Called then the local video stream is ready
    onlocalstream: function(stream) {
        videowall.localvideotag.src = window.URL.createObjectURL(stream);
        Object.keys(videowall.clients).forEach(function(key) {
            videowall.rtc.call(key);
        });
    },
    // Called when a video stream of a remote client came in
    onremotestream: function(event) {
        var client = videowall.clients[event.connection.remoteClientId];
        client.videotag = document.createElement("video");
        client.videotag.autoplay = "autoplay";
        client.videotag.src = window.URL.createObjectURL(event.stream);
        videowall.videolisttag.appendChild(client.videotag);
    },
    init: function(selector) {

        // Init local video
        videowall.videolisttag = document.querySelector(selector);
        videowall.localvideotag.autoplay = "autoplay";
        videowall.videolisttag.appendChild(videowall.localvideotag);

        // Init WebRTC
        videowall.rtc = new WebRTC({ audio: true, video: true}, { autoacceptincomingcalls: true, makethumbnails: false });
        videowall.rtc.on("clientList", videowall.onclientlist);
        videowall.rtc.on("clientConnected", videowall.onclientconnected);
        videowall.rtc.on("clientDisconnected", videowall.onclientdisconnected);
        videowall.rtc.on("localStream", videowall.onlocalstream);
        videowall.rtc.on("remoteStream", videowall.onremotestream);

    },
};
