
var vraudiochat = {
    rtc: null,
    clients: {},
    positions: [null, null, null, null],
    scenetag: null,
    assetstag: null,
    onclientlist: function(clientlist) {
        vraudiochat.clients = clientlist;
    },
    onclientconnected: function(client) {
        vraudiochat.clients[client.id] = client;
    },
    onclientdisconnected: function(client) {
        client.audiotag.pause();
        client.audiotag.src = "";
        vraudiochat.assetstag.removeChild(client.audiotag);
        vraudiochat.scenetag.removeChild(client.avatar);
        delete vraudiochat.clients[client.id];
        if (client.position >= 0) vraudiochat.positions[client.position] = false;
    },
    onlocalstream: function(stream) {
        vraudiochat.createavatar();

        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Float32Array(bufferLength);
        var min = analyser.minDecibels;
        var istalking = false;
        // selftag.innerHTML = "SELF: " + istalking;
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
                // selftag.innerHTML = "SELF: " + istalking;
                vraudiochat.rtc.socket.emit('Message', { // Inform others about my Gebrabbel
                    type: 'talking',
                    content: istalking
                });
            }
        }

        window.setInterval(analyze, 100);

        Object.keys(vraudiochat.clients).forEach(function(key) {
            vraudiochat.rtc.call(key);
        });

    },
    onremotestream: function(event) {
        var client = vraudiochat.clients[event.connection.remoteClientId];
        client.audiotag = document.createElement("audio");
        client.audiotag.autoplay = "autoplay";
        client.audiotag.src = window.URL.createObjectURL(event.stream);
        vraudiochat.assetstag.appendChild(client.audiotag);
        vraudiochat.createavatar(client);
    },
    onmessage: function(message) {
        if (message.type !== "talking") return; // Handle only talking information
        var client = vraudiochat.clients[message.from];
        console.log(message.content);
        if (client.avatar) client.avatar.setAttribute("color", message.content ? "#00CC00" : "#EF2D5E");
        // if (client.leveltag) client.leveltag.innerHTML = client.id + ": " + message.content;
    },
    createavatar: function(client) {
        var avatar = document.createElement("a-sphere");
        if (client) { // Remote client
            client.avatar = avatar;
        } else { // Player himself
            avatar.setAttribute("camera", "");
            avatar.setAttribute("look-controls", "");
            avatar.setAttribute("wasd-controls", "");
        }
        avatar.setAttribute("color", "#EF2D5E");
        var position = "0 1.25 0";
        if (!vraudiochat.positions[0]) { position = "0 1.25 4"; vraudiochat.positions[0] = true; if (client) client.position = 0; }
        else if (!vraudiochat.positions[1]) { position = "4 1.25 0"; vraudiochat.positions[1] = true; if (client) client.position = 1; }
        else if (!vraudiochat.positions[2]) { position = "0 1.25 -4"; vraudiochat.positions[2] = true; if (client) client.position = 2; }
        else if (!vraudiochat.positions[3]) { position = "-4 1.25 0"; vraudiochat.positions[3] = true; if (client) client.position = 3; }
        avatar.setAttribute("position", position);
        vraudiochat.scenetag.appendChild(avatar);
    },
    init: function() {

        vraudiochat.scenetag = document.querySelector("a-scene");
        vraudiochat.assetstag = document.querySelector("a-assets");

        // Init WebRTC
        vraudiochat.rtc = new WebRTC({ audio: true }, { autoacceptincomingcalls: true });
        vraudiochat.rtc.on("clientList", vraudiochat.onclientlist);
        vraudiochat.rtc.on("clientConnected", vraudiochat.onclientconnected);
        vraudiochat.rtc.on("clientDisconnected", vraudiochat.onclientdisconnected);
        vraudiochat.rtc.on("localStream", vraudiochat.onlocalstream);
        vraudiochat.rtc.on("remoteStream", vraudiochat.onremotestream);

        vraudiochat.rtc.socket.on("Message", vraudiochat.onmessage);

    },
};
