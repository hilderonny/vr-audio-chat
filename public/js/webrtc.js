function WebRTCConnection(socket, remoteClientId, addRemoteStreamCallback) {

    var self = this;

    self.remoteClientId = remoteClientId;
    self.socket = socket;
    self.addRemoteStreamCallback = addRemoteStreamCallback;

    // Eindeutige IDs, um mehrfache Verbindungen zu einem Client zu unterscheiden 
    self.id = remoteClientId + (new Date()).getTime();

    self.peerConnection = new RTCPeerConnection(null);

    /**
     * Lokalen Videostream festlegen
     */
    self.addLocalStream = function(localStream) {
        self.peerConnection.addStream(localStream);
    };

    /**
     * Verbindung zur Gegenstelle schließen
     */
    self.close = function() {
        if (self.isClosed) return;
        self.isClosed = true;
        self.peerConnection.close();
        self.socket.emit('Message', {
            to: self.remoteClientId,
            type: 'WebRTCclose',
            content: self.id
        });
    };

    /**
     * Beschreibung der Gegenstelle festlegen
     */
    self.setRemoteSessionDescription = function(remoteSessionDescription) {
        self.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteSessionDescription));
    };

    /**
     * ICE Kandidaten der Gegenstelle festlegen
     */
    self.addRemoteIceCandidate = function(remoteIceCandidateDescription) {
        self.peerConnection.addIceCandidate(new RTCIceCandidate(remoteIceCandidateDescription));
    };

    /**
     * Verbindungsanfrage an Gegenstelle schicken
     */
    self.sendOffer = function(done) {
        self.peerConnection.createOffer().then(function(localSessionDescription) {
            self.peerConnection.setLocalDescription(localSessionDescription);
            self.socket.emit('Message', {
                to: self.remoteClientId,
                type: 'WebRTCcall',
                content: {
                    connectionId: self.id,
                    sessionDescription: localSessionDescription
                }
            });
            if (done) done();
        });

    };

    /**
     * Verbindungsanfrage von Gegenstelle annehmen und Antwort zurück schicken
     */
    self.accept = function(done) {
        self.peerConnection.createAnswer().then(function(localSessionDescription) {
            self.peerConnection.setLocalDescription(localSessionDescription);
            self.socket.emit('Message', {
                to: self.remoteClientId,
                type: 'WebRTCaccept',
                content: { connectionId: self.id, sessionDescription: localSessionDescription }
            });
            if (done) done();
        });
    };

    // Lehnt die eingehende Verbindung ab und schließt diese
    self.reject = function(done) {
        self.close();
        self.socket.emit('Message', {
            to: self.remoteClientId,
            type: 'WebRTCreject',
            content: self.id
        });
    };
    
    // Wenn lokaler ICE Kandidat erkannt wurde wird dieser an die Gegenstelle geschickt
    self.peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
            self.socket.emit('Message', {
                to: self.remoteClientId,
                type: 'WebRTCiceCandidate',
                content: { connectionId: self.id, remoteIceCandidateDescription: event.candidate }
            });
        }
    };

    // Stream von Gegenstelle erhalten
    self.peerConnection.onaddstream = function(event) {
        if (self.addRemoteStreamCallback) {
            self.addRemoteStreamCallback(self, event.stream);
        }
    };

    self.peerConnection.closeConnection = self.close;
    self.peerConnection.onremovestream = self.close;

}

/**
 * Helferlein für WebRTC Calls.
 * Funktionen:
 * - on(eventName, handler) - Event handler registrieren
 * - setLocalClientName(newLocalClientName) - Namen des lokalen Clients festlegen und rumposaunen
 * - call(remoteClientId) - Gegenstelle anrufen
 * - acceptIncomingCall(connectionId) - Eingehende Verbindungsanfrage annehmen
 * - rejectIncomingCall(connectionId) - Eingehende Verbindungsanfrage ablehnen
 * Events:
 * 'clientChanged' : Wenn der Name oder eine andere Eigenschaft eines Clients geändert wurde. Parameter: Der Client mit geänderten Daten.
 * 'clientConnected' : Wenn sich ein anderer Client mit dem Server verbunden hat. Parameter: neuer Client
 * 'clientDisconnected' : Wenn ein anderer Client vom Server getrennt wurde. Parameter: getrennter Client
 * 'clientList' : Wenn vom Server eine Liste von Clients erhalten wurde. Parameter: Aktuelle LOKALE Clientliste.
 * 'clientThumbnail' : Wenn ein Clients ein neues Thumbnail bekam. Parameter: Der Client mit thumbnail.
 * 'connectionClosed' : Wenn eine Verbindung geschlossen wurde. Parameter: geschlossene Verbindung
 * 'incomingCall' : Wenn eine Verbindungsanfrage eingeht. Parameter: eingehende Verbindung
 * 'incomingCallAccepted' : Wenn eine eingehende Verbindung angenommen wurde. Parameter: eingehende Verbindung
 * 'incomingCallRejected' : Wenn eine eingehende Verbindung abgelehnt wurde. Parameter: abgelehnte Verbindung
 * 'localStream' : Die Initialisierung der eigenen Kamera ist fertig und der lokale Stream steht bereit. Parameter: lokaler Stream
 * 'localThumbnail' : Es wurde ein Thumbnail von der lokalen Kamera erstellt. Parameter: Image als Daten-URL
 * 'outgoingCall' : Verbindungsanfrage wurde an Gegenstelle gesendet. Parameter: ausgehende Verbindung
 * 'outgoingCallAccepted' : Gegenstelle hat Verbindungsanfrage angenommen. Parameter: ausgehende Verbindung
 * 'outgoingCallRejected' : Gegenstelle hat Verbindungsanfrage abgelehnt. Parameter: ausgehende Verbindung
 * 'remoteIceCandidate' : Gegenstelle hat einen ICE-Kandidaten geschickt. Parameter: ICE-Kanididat
 * 'remoteStream' : Gegenstelle hat VideoStream bereit gestellt. Parameter: Verbindung und stream
 * Config:
 * {
 *  autoacceptincomingcalls: false,
 *  makethumbnails: false
 * }
 * Beispiel:
 *      var clientList = {};
 *      var rtc = new WebRTC({audio:true,video:true}, { autoacceptincomingcalls: false, makethumbnails: true });
 *      rtc.on('clientList', function(newClientList) {
 *          clientList = newClientList;
 *      });
 *      rtc.on('incomingCall', function(incomingConnection) {
 *          rtc.acceptIncomingCall(incomingConnection.id);
 *      });
 *      rtc.on('localStream', function(localStream) {
 *          document.getElementById('localVideo').src = window.URL.createObjectURL(localStream);
 *      });
 *      rtc.on('remoteStream', function(event) {
 *          document.getElementById('remoteVideo').src = window.URL.createObjectURL(event.stream);
 *      });
 *      rtc.setLocalClientName('Mein Eigener Name');
 *      rtc.call(clientList[0].id); // Erst, nachdem die Liste gefüllt wurde
 */
function WebRTC(localMediaProperties, config) {

    var self = this;

    /**
     * Gibt an, on eingehende Verbindungen automatisch beantwortet werden sollen.
     */
    self.autoAcceptIncomingCall = config && config.autoacceptincomingcalls;

    /**
     * Einstellungen für navigator.mediaDevices.getUserMedia()
     */
    self.localMediaProperties = localMediaProperties || { audio: true, video: true };

    /**
     * Stream der eigenen Kamera
     */
    self.localMediaStream = false;

    /**
     * Liste aller registrierten Event Handler
     */
    self.eventHandler = {};
    /**
     * Liste aller bekannter Clients (außer sich selbst)
     */
    self.remoteClients = {};
    /**
     * Liste aller Verbindungen zu anderen Clients. Als Keys werden die
     * Connection IDs gehalten.
     */
    self.connections = {};

    /**
     * WebSocket-Verbindung zum Server
     */
    self.socket = io();

    /**
     * Methode zum registrieren von Events.
     */
    self.on = function(eventName, handler) {
        if (!self.eventHandler[eventName]) {
            self.eventHandler[eventName] = [];
        }
        self.eventHandler[eventName].push(handler);
        return self; // For call chaining á la rtc.on(...).on(...)
    };

    /**
     * Sendet ein Event an alle auf den Namen registrierten Event handler
     */
    self.sendEvent = function(eventName, data) {
        if (!self.eventHandler[eventName]) {
            return;
        }
        self.eventHandler[eventName].forEach(function(handler) {
            handler(data);
        });
    };

    /**
     * Fügt einen neuen Client der Liste bekannter Clients hinzu und sendet ein
     * 'clientConnected' Event.
     */
    self.addRemoteClient = function(remoteClientId) {
        var newClient = { id : remoteClientId };
        self.remoteClients[remoteClientId] = newClient;
        self.sendEvent('clientConnected', newClient);
    };

    /**
     * Entfernt einen Client aus der Clientliste und schließt ggf. existierende
     * Verbindungen zu eben diesem. Sendet die Events 'connectionClosed' (bei Bedarf)
     * und 'clientDisconnected'.
     */
    self.removeRemoteClient = function(remoteClientId) {
        // Eventuell bestehende Verbindungen schließen
        if (self.connections[remoteClientId]) {
            self.connections[remoteClientId].forEach(function(connection) {
                connection.close();
                self.sendEvent('connectionClosed', connection);
            });
            delete self.connections[remoteClientId];
        }
        // Client aus Liste entfernen
        if (self.remoteClients[remoteClientId]) {
            var disconnectedClient = self.remoteClients[remoteClientId];
            delete self.remoteClients[remoteClientId];
            self.sendEvent('clientDisconnected', disconnectedClient);
        }
    };

    /**
     * Verarbeitet die Clientliste vom Server. Wird i.d.R. nur beim ersten Aufruf der Seite
     * getriggert. Sendet Event 'clientList'.
     */
    self.handleClientListFromServer = function(clientListFromServer) {
        clientListFromServer.forEach(function(clientFromServer) {
            // Bereits bekannte Clients werden nich verarbeitet
            if (self.remoteClients[clientFromServer.id]) {
                return;
            }
            self.remoteClients[clientFromServer.id] = clientFromServer;
        });
        self.sendEvent('clientList', self.remoteClients);
    };

    /**
     * Aktualisiert den Namen eines Clients und sendet das Event 'clientChanged'.
     */
    self.handleNewClientName = function(remoteClientId, newClientName) {
        var remoteClient = self.remoteClients[remoteClientId];
        if (!remoteClient) {
            return;
        }
        remoteClient.name = newClientName;
        self.sendEvent('clientChanged', remoteClient);
    };

    /**
     * Schickt den Namen als neuen Namen des lokalen Clients an den Server
     */
    self.setLocalClientName = function(newLocalClientName) {
        self.socket.emit('Message', {
            type: 'WebRTCclientName',
            content: newLocalClientName
        });
    };

    /**
     * Wird aufgerufen, wenn die Gegenstellen einen Stream geschickt hat. Event 'remoteStream'
     */
    self.handleRemoteStreamAdded = function(connection, remoteStream) {
        self.sendEvent('remoteStream', { connection: connection, stream : remoteStream });
    };

    /**
     * Registriert eine eingehende Verbindung und beantwortet diese, wenn autoAcceptIncomingCall = true ist.
     * Event: 'incomingCall'
     */
    self.handleIncomingCall = function(remoteClientId, remoteConnectionId, remoteSessionDescription) {
        var newConnection = new WebRTCConnection(self.socket, remoteClientId, self.handleRemoteStreamAdded);
        newConnection.id = remoteConnectionId;
        if (self.localMediaStream) {
            newConnection.addLocalStream(self.localMediaStream);
        }
        newConnection.setRemoteSessionDescription(remoteSessionDescription);
        self.connections[newConnection.id] = newConnection;
        // Eingehende Verbindung behandeln
        if (self.autoAcceptIncomingCall) {
            self.acceptIncomingCall(newConnection.id);
        }
        self.sendEvent('incomingCall', newConnection);
    };

    /**
     * Eingehende Verbindung annehmen und aufbauen. Event: 'incomingCallAccepted'
     */
    self.acceptIncomingCall = function(connectionId) {
        var connection = self.connections[connectionId];
        if (!connection) {
            return;
        }
        connection.accept(function() {
            self.sendEvent('incomingCallAccepted', connection);
        });
    };

    /**
     * Eingehende Verbindung ablehnen. Event: 'incomingCallRejected'
     */
    self.rejectIncomingCall = function(connectionId) {
        var connection = self.connections[connectionId];
        if (!connection) {
            return;
        }
        connection.close();
        delete self.connections[connectionId];
        self.sendEvent('incomingCallRejected', connection);
    };

    /**
     * Behandelt Akzeptiert-Antworten auf Verbindungsanfragen und sendet Event 'outgoingCallAccepted'
     */
    self.handleCallAccepted = function(connectionId, remoteSessionDescription) {
        var connection = self.connections[connectionId];
        if (!connection) {
            return;
        }
        connection.setRemoteSessionDescription(remoteSessionDescription);
        self.sendEvent('outgoingCallAccepted', connection);
    };

    /**
     * Behandelt Abgelehnt-Antworten auf Verbindungsanfragen und sendet Event 'outgoingCallRejected'
     */
    self.handleCallRejected = function(connectionId) {
        var connection = self.connections[connectionId];
        if (!connection) {
            return;
        }
        connection.close();
        delete self.connections[connectionId];
        self.sendEvent('outgoingCallRejected', connection);
    };

    /**
     * Behandelt das Auflegen von Verbindungen von remote und sendet Event 'connectionClosed'
     */
    self.handleCallClosed = function(connectionId) {
        var connection = self.connections[connectionId];
        if (!connection) {
            return;
        }
        connection.close();
        delete self.connections[connectionId];
        self.sendEvent('connectionClosed', connection);
    };

    /**
     * Verarbeitet die ICE-Kandidaten einer Gegenstelle einer Verbindung und sendet Event 'remoteIceCandidate'.
     */
    self.handleRemoteIceCandidate = function(connectionId, remoteIceCandidateDescription) {
        var connection = self.connections[connectionId];
        if (!connection) {
            return;
        }
        var remoteIceCandidate = connection.addRemoteIceCandidate(remoteIceCandidateDescription);
        self.sendEvent('remoteIceCandidate', remoteIceCandidate);
    };

    /**
     * Aktualisiert das aktuelle Thumbnail eines Clients und sendet das Event 'clientThumbnail'.
     */
    self.handleRemoteThumbnail = function(remoteClientId, imageDataUrl) {
        var remoteClient = self.remoteClients[remoteClientId];
        if (!remoteClient) {
            return;
        }
        remoteClient.thumbnail = imageDataUrl;
        self.sendEvent('clientThumbnail', remoteClient);
    };

    /**
     * Ruft eine Gegenstelle an. Event 'outgoingCall'. Ergebnis: newConnection
     */
    self.call = function(remoteClientId) {
        var remoteClient = self.remoteClients[remoteClientId];
        if (!remoteClient) {
            return;
        }
        var newConnection = new WebRTCConnection(self.socket, remoteClientId, self.handleRemoteStreamAdded);
        if (self.localMediaStream) {
            newConnection.addLocalStream(self.localMediaStream);
        }
        self.connections[newConnection.id] = newConnection;
        newConnection.sendOffer(function() {
            self.sendEvent('outgoingCall', newConnection);
        });
        return newConnection;
    };

    // Socket-Nachrichten behandeln
    self.socket.on('Message', function(message) {
        switch(message.type) {
            case 'WebRTCclientConnected': self.addRemoteClient(message.content); break;
            case 'WebRTCclientDisconnected': self.removeRemoteClient(message.content); break;
            case 'WebRTCclientList': self.handleClientListFromServer(message.content); break;
            case 'WebRTCclientName': self.handleNewClientName(message.from, message.content); break;
            case 'WebRTCcall': self.handleIncomingCall(message.from, message.content.connectionId, message.content.sessionDescription); break;
            case 'WebRTCaccept': self.handleCallAccepted(message.content.connectionId, message.content.sessionDescription); break;
            case 'WebRTCreject': self.handleCallRejected(message.content); break;
            case 'WebRTCiceCandidate': self.handleRemoteIceCandidate(message.content.connectionId, message.content.remoteIceCandidateDescription); break;
            case 'WebRTCthumbnail': self.handleRemoteThumbnail(message.from, message.content); break;
            case 'WebRTCclose': self.handleCallClosed(message.content); break;
        }
    });

    /**
     * Macht ein Thumbnail vom lokalen Video und sendet "localThumbnail" Ereignis
     */
    self.createThumbnail = function() {
        if (!self.videoTagForThumbnail) return;
        var canvas = document.createElement('canvas');
        var videoWidth = self.videoTagForThumbnail.videoWidth;
        var videoHeight = self.videoTagForThumbnail.videoHeight;
        var factor = 160 / (videoWidth > videoHeight ? videoWidth : videoHeight);
        var scaledWidth = videoWidth * factor;
        var scaledHeight = videoHeight * factor; 
        canvas.setAttribute('width', scaledWidth + 'px');
        canvas.setAttribute('height', scaledHeight + 'px');
        var context2D = canvas.getContext('2d');
        context2D.drawImage(self.videoTagForThumbnail, 0, 0, scaledWidth, scaledHeight);
        var imageDataUrl = canvas.toDataURL('image/png');
        // Send local event
        self.sendEvent('localThumbnail', imageDataUrl);
        // Send Thumbnail to other Clients
        self.socket.emit('Message', {
            type: 'WebRTCthumbnail',
            content: imageDataUrl
        });
    };

    // Lokales Video initialisieren, sendet Event 'localStream' und startet Thumbnail Erstellung
    navigator.mediaDevices.getUserMedia(localMediaProperties).then(function(stream) {
        Object.keys(self.connections).forEach(function(connectionId) {
            self.connections[connectionId].addLocalStream(stream);
        });
        self.localMediaStream = stream;
        self.sendEvent('localStream', stream);
        // Thumbnails vorbereiten und starten
        if (config && config.makethumbnails) {
            self.videoTagForThumbnail = document.createElement('video');
            self.videoTagForThumbnail.setAttribute('autoplay', 'autoplay');
            self.videoTagForThumbnail.src = window.URL.createObjectURL(stream);
            setInterval(self.createThumbnail, 5000);
            self.createThumbnail();
        }
    });

}
