
var audio = {
    rtc: null,
    clients: {},
    audiolevelstag: null,
    onclientlist: function(clientlist) {
        audio.clients = clientlist;
    },
    onclientconnected: function(client) {
        audio.clients[client.id] = client;
    },
    onclientdisconnected: function(client) {
        client.audiotag.pause();
        client.audiotag.src = "";
        audio.audiolevelstag.removeChild(client.audiotag);
        audio.audiolevelstag.removeChild(client.leveltag);
        delete audio.clients[client.id];
    },
    onlocalstream: function(stream) {
        var selftag = document.createElement("div");
        audio.audiolevelstag.appendChild(selftag);

        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Float32Array(bufferLength);
        var min = analyser.minDecibels;
        var istalking = false;
        selftag.innerHTML = "SELF: " + istalking;
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
                selftag.innerHTML = "SELF: " + istalking;
                audio.rtc.socket.emit('Message', { // Inform others about my Gebrabbel
                    type: 'talking',
                    content: istalking
                });
            }
        }

        window.setInterval(analyze, 100);

        Object.keys(audio.clients).forEach(function(key) {
            audio.rtc.call(key);
        });

    },
    onremotestream: function(event) {
        var client = audio.clients[event.connection.remoteClientId];
        client.audiotag = document.createElement("audio");
        client.audiotag.autoplay = "autoplay";
        client.audiotag.src = window.URL.createObjectURL(event.stream);
        client.leveltag = document.createElement("div");
        client.leveltag.innerHTML = client.id + ": false";
        audio.audiolevelstag.appendChild(client.audiotag);
        audio.audiolevelstag.appendChild(client.leveltag);
    },
    onmessage: function(message) {
        if (message.type !== "talking") return; // Handle only talking information
        var client = audio.clients[message.from];
        if (client.leveltag) client.leveltag.innerHTML = client.id + ": " + message.content;
    },
    init: function(selector) {

        audio.audiolevelstag = document.querySelector("#audiolevels");

        // Init WebRTC
        audio.rtc = new WebRTC({ audio: true }, { autoacceptincomingcalls: true });
        audio.rtc.on("clientList", audio.onclientlist);
        audio.rtc.on("clientConnected", audio.onclientconnected);
        audio.rtc.on("clientDisconnected", audio.onclientdisconnected);
        audio.rtc.on("localStream", audio.onlocalstream);
        audio.rtc.on("remoteStream", audio.onremotestream);

        audio.rtc.socket.on("Message", audio.onmessage);

    },
};
