
var audio = {
    rtc: null,
    // clients: {},
    // videolisttag: null,
    // localvideotag: document.createElement("video"),
    // // Called when the page is loaded and a list of already connected clients is fetched
    // onclientlist: function(clientlist) {
    //     videowall.clients = clientlist;
    // },
    // // Called when a new remote client connects
    // onclientconnected: function(client) {
    //     videowall.clients[client.id] = client;
    // },
    // // Called when a remote client disconnected
    // onclientdisconnected: function(client) {
    //     client.videotag.pause();
    //     client.videotag.src = "";
    //     client.videotag.parentNode.removeChild(client.videotag);
    //     delete videowall.clients[client.id];
    // },
    onlocalstream: function(stream) {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Float32Array(bufferLength);
        var min = analyser.minDecibels;
        var istalking = false;
        var source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        function analyze() {
            analyser.getFloatFrequencyData(dataArray);
            var max = min;
            dataArray.forEach(function(val) { if (val > max) max = val; });
            var istalkingnow = max > min / 2;
            if (istalking !== istalkingnow) {
                istalking = istalkingnow;
                console.log(istalking);
            }
        }

        window.setInterval(analyze, 100);

    // videowall.localvideotag.src = window.URL.createObjectURL(stream);
        // Object.keys(videowall.clients).forEach(function(key) {
        //     videowall.rtc.call(key);
        // });
    },
    // // Called when a video stream of a remote client came in
    // onremotestream: function(event) {
    //     var client = videowall.clients[event.connection.remoteClientId];
    //     client.videotag = document.createElement("video");
    //     client.videotag.autoplay = "autoplay";
    //     client.videotag.src = window.URL.createObjectURL(event.stream);
    //     videowall.videolisttag.appendChild(client.videotag);
    // },
    init: function(selector) {

        // Init WebRTC
        audio.rtc = new WebRTC({ audio: true }, { autoacceptincomingcalls: true });
        // audio.rtc.on("clientList", videowall.onclientlist);
        // audio.rtc.on("clientConnected", videowall.onclientconnected);
        // audio.rtc.on("clientDisconnected", videowall.onclientdisconnected);
        audio.rtc.on("localStream", audio.onlocalstream);
        // audio.rtc.on("remoteStream", videowall.onremotestream);

    },
};
