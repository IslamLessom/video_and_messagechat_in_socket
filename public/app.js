const socket = io();
let localStream;
let peerConnection;
let dataChannel;

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const roomInput = document.getElementById("roomId");
const joinButton = document.getElementById("joinBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const messageInput = document.getElementById("messageInput");
const sendMessageButton = document.getElementById("sendMessageBtn");
const chatMessages = document.getElementById("chatMessages");
let roomId = 0;

joinButton.onclick = () => {
  const newRoomId = roomInput.value;
  if (roomId !== newRoomId) {
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
      remoteVideo.srcObject = null;
    }
    roomId = newRoomId;
    socket.emit("join room", roomId);
    startLocalStream();
  }
};

async function startLocalStream() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(configuration);

  // Create Data Channel
  dataChannel = peerConnection.createDataChannel("chat");

  // Set up event handlers for Data Channel
  dataChannel.onopen = () => console.log("Data channel is open");
  dataChannel.onmessage = (event) => {
    chatMessages.innerHTML += `<p>Friend: ${event.data}</p>`;
  };

  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.onnegotiationneeded = async () => {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("signal", { signal: offer, roomId });
    } catch (error) {
      console.error("Error during negotiation:", error);
    }
  };

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("signal", { signal: e.candidate, roomId });
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  socket.on("signal", async (data) => {
    if (data.signal) {
      if (data.signal.candidate) {
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(data.signal)
          );
        } catch (error) {
          console.error("Failed to add ICE candidate:", error);
        }
      } else {
        const offerDescription = new RTCSessionDescription(data.signal);
        try {
          await peerConnection.setRemoteDescription(offerDescription);
          const answerDescription = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answerDescription);
          socket.emit("signal", { signal: answerDescription, roomId });
        } catch (error) {
          console.error(
            "Error setting remote description or creating answer:",
            error
          );
        }
      }
    }
  });
}

// Sending a message via Socket.IO
sendMessageButton.onclick = () => {
  const messageText = messageInput.value;
  if (messageText && roomId) {
    // Emit chat message to the server
    socket.emit("chat message", { message: messageText, roomId });

    // Display your own message in the chat
    chatMessages.innerHTML += `<p>You: ${messageText}</p>`;
    messageInput.value = ""; // Clear input after sending
  }
};

// Listen for incoming chat messages from the server
socket.on("chat message", (data) => {
  chatMessages.innerHTML += `<p>Friend: ${data.message}</p>`;
});
