var socket = io.connect("http://localhost:4000");

var divVideoChatLobby = document.getElementById("video-chat-lobby");
var divVideoChat = document.getElementById("video-chat-room");
var joinButton = document.getElementById("join");
var userVideo = document.getElementById("user-video");
var peerVideo = document.getElementById("peer-video");
var roomInput = document.getElementById("roomName");

var divButtonGroup = document.getElementById("button-troup");
var muteButton = document.getElementById("muteButton");
var hideCameraButton = document.getElementById("hideCameraButton");
var leaveRoomButton = document.getElementById("leaveRoomButton");

var muteFlag = false;
var hideCameraFlag = false;

var roomName;
var creator = false;
var rtcPeerConnection;
var userStream;

var iceServers = {
    iceServers: [
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "stun:stun1.l.google.com:19302" }
    ],
};

leaveRoomButton.addEventListener("click", function () {
    socket.emit("leave", roomName);
    divVideoChatLobby.style = "display:block";
    divButtonGroup.style = "display:none";
    if (userVideo.srcObject) userVideo.srcObject.getTracks().forEach(track => track.stop());
    if (peerVideo.srcObject) peerVideo.srcObject.getTracks().forEach(track => track.stop());
    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }
});

socket.on("leave", function () {
    creator = true;
    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }
    if (peerVideo.srcObject) peerVideo.srcObject.getTracks().forEach(track => track.stop());
});


muteButton.addEventListener("click", function () {
    muteFlag = !muteFlag;
    if (muteFlag) {
        userStream.getTracks()[0].enabled = false;
        muteButton.textContent = "Unmute";
    } else {
        userStream.getTracks()[0].enabled = true;
        muteButton.textContent = "Mute";
    }
});

hideCameraButton.addEventListener("click", function () {
    hideCameraFlag = !hideCameraFlag;
    if (hideCameraFlag) {
        userStream.getTracks()[1].enabled = false;
        hideCameraButton.textContent = "Show Camera";
    } else {
        userStream.getTracks()[1].enabled = true;
        hideCameraButton.textContent = "Hide Camera";
    }
});

joinButton.addEventListener("click", function () {
    if (roomInput.value == "") {
        alert("Please enter a room name");
    } else {
        roomName = roomInput.value;
        socket.emit("join", roomName);
    }
});

socket.on("created", function () {
    creator = true;

    //navigator.mediaDevices.getUserMedia({ audio: false, video: { width: 500, height: 500 } })
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function (stream) {
            userStream = stream;
            divVideoChatLobby.style = "display:none";
            divButtonGroup.style = "display:flex"
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function (e) {
                userVideo.play();
            };
        })
        .catch(function (err) {
            console.log("The following error occurred: " + err);
        });

});

socket.on("joined", function () {
    creator = false;

    //navigator.mediaDevices.getUserMedia({ audio: false, video: { width: 500, height: 500 } })
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function (stream) {
            userStream = stream;
            divVideoChatLobby.style = "display:none";
            divButtonGroup.style = "display:flex"
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function (e) {
                userVideo.play();
            };
            socket.emit("ready", roomName);
        })
        .catch(function (err) {
            console.log("The following error occurred: " + err);
        });

});

socket.on("full", function () {
    alert("Room is full, can't join!");
});

socket.on("ready", function () {
    if (creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = OnTrackFunction;
        //audio & video
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
        rtcPeerConnection.createOffer().then(offer => {
            rtcPeerConnection.setLocalDescription(offer);
            socket.emit("offer", offer, roomName);
        }).catch(error => {
            console.log(error);
        });
    }
});

socket.on("candidate", function () {
    var iceCandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(iceCandidate);
});

socket.on("offer", function (offer) {
    if (!creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = OnTrackFunction;
        //audio & video
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
        rtcPeerConnection.setRemoteDescription(offer);

        rtcPeerConnection.createAnswer().then(answer => {
            rtcPeerConnection.setLocalDescription(answer);
            socket.emit("answer", answer, roomName);
        }).catch(error => {
            console.log(error);
        });
    }
});

socket.on("answer", function (answer) {
    rtcPeerConnection.setRemoteDescription(answer);
});

function OnIceCandidateFunction(event) {
    if (event.candidate) {
        socket.emit("candidate", event.candidate, roomName);
    }
}

function OnTrackFunction(event) {
    peerVideo.srcObject = event.streams[0];
    peerVideo.onloadedmetadata = function (e) {
        peerVideo.play();
    };
}