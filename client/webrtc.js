var localVideo;
var remoteVideo;
var peerConnection;
var uuid;

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

function pageReady() {
    
    //hiding end button, connection not yet established
    document.getElementById("end").style.visibility="hidden"; 

    uuid = uuid();

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    var host = location.origin.replace(/^http/, 'ws');
    var serverConnection = new WebSocket(host);
    /*serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    serverConnection.onmessage = gotMessageFromServer;*/

    var constraints = {
        video: true,
        audio: true,
    };
    //if browser is WebRTC compatable, enable audio and video
    //use the created local video stream to assign to localVid elt in html (ln 39)
    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
    } else {
        alert('Your browser does not support getUserMedia API');
    }
}

function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.src = window.URL.createObjectURL(stream);
    
}
//button that starts the 'call'
//isCaller set to true inside of html start button elt
function start(isCaller) {

    //makes end button visible
    setTimeout(function() {
        document.getElementById("end").style.visibility="visible";
    }, 500);
   
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    //gotIceCandidate = line 83
    peerConnection.onicecandidate = gotIceCandidate;
    //gotRemoteStream = line 97
    //implemented once on add stream is implemented
    peerConnection.onaddstream = gotRemoteStream;
    //adds a media stream as a local source of audio/video
    peerConnection.addStream(localStream);
    


    if(isCaller) {
        //createdDescription - line 98
        peerConnection.createOffer().then(createdDescription).catch(errorHandler);
    }
}


function gotMessageFromServer(message) {
    if(!peerConnection) start(false);

    var signal = JSON.parse(message.data);

    // Ignore messages from ourself
    if(signal.uuid == uuid) return;
    
    if(signal.sdp) {
        //RTCSessionDescription describes one end of the connection
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            console.log('new RTC session created');
            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                console.log('Answer created');
                //createAnswer creates an SDP answer to an offer
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
    } else if(signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);

    }
}

//sends ice candidate to the server
//ice = interactive connectivity establishment
function gotIceCandidate(event) {
    if(event.candidate != null) {
        serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
}

function createdDescription(description) {
    console.log('got description');
    //sends the local sdp(Session Description Protocol) as well as unique uuid to server
    peerConnection.setLocalDescription(description).then(function() {
        serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
}
//called when local stream is added
function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteStream = event.stream; 
    remoteVideo.src = window.URL.createObjectURL(event.stream);
}

//error handler used in all catch statements
function errorHandler(error) {
    console.log(error);
}

//end button I added
function endCall(event) {
    remoteStream.getTracks().forEach(track => track.stop());
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
