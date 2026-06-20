import { createContext, useContext, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { apiUrl } from "../utils/api";

const CHUNK_SIZE = 64 * 1024;

const P2PContext = createContext();

export const useP2P = () => useContext(P2PContext);

export const P2PProvider = ({ children }) => {
  const [p2pStatus, setP2pStatus] = useState("idle"); 
  const [progress, setProgress] = useState(0);
  
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const stashKeyRef = useRef(""); 
  const fileDataRef = useRef({ receivedBuffers: [], expectedSize: 0, receivedSize: 0, metadata: null });

  const initSocket = useCallback(() => {
    if (!socketRef.current) {
      const socketUrl = apiUrl("").replace("/api", ""); 
      socketRef.current = io(socketUrl); 
    } else if (socketRef.current.disconnected) {
      socketRef.current.connect();
    }
  }, []);

  const createPeerConnection = (stashKey) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ 
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "d4cbfb38aef88df98b0b6c55",
        credential: "E/sEWCIIuwFHe6zn",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "d4cbfb38aef88df98b0b6c55",
        credential: "E/sEWCIIuwFHe6zn",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "d4cbfb38aef88df98b0b6c55",
        credential: "E/sEWCIIuwFHe6zn",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "d4cbfb38aef88df98b0b6c55",
        credential: "E/sEWCIIuwFHe6zn",
      },
  ],
});

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("signal", { stashKey, signal: { type: "candidate", candidate: event.candidate } });
      }
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "disconnected" || peer.iceConnectionState === "failed") {
        setP2pStatus("error");
      }
    };

    return peer;
  };

  const startHosting = useCallback((stashKey, filesToSend) => {
    initSocket();
    stashKeyRef.current = stashKey;
    setP2pStatus("waiting");

    socketRef.current.off("peer-joined");
    socketRef.current.off("signal");

    socketRef.current.emit("join-room", stashKey);

    socketRef.current.on("peer-joined", async () => {
      if (peerRef.current) return; 

      setP2pStatus("connecting");
      
      const peer = createPeerConnection(stashKey);
      peerRef.current = peer;

      const channel = peer.createDataChannel("stash-it-transfer");
      channelRef.current = channel;

      channel.onopen = async () => {
        setP2pStatus("transferring");
        
        for (let i = 0; i < filesToSend.length; i++) {
          if (peerRef.current.iceConnectionState === "disconnected") break;
          await sendFile(filesToSend[i], channel); 
        }
        
        if (peerRef.current.iceConnectionState !== "disconnected") {
          setP2pStatus("complete");
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socketRef.current.emit("signal", { stashKey, signal: offer });
    });

    socketRef.current.on("signal", async (signal) => {
      // --- THE FIX: Clean up first, then set the error state ---
      if (signal.type === "cancel") {
        cleanupP2P();
        setP2pStatus("error");
        return;
      }

      try {
        if (signal.type === "answer") {
          if (peerRef.current && peerRef.current.signalingState !== "stable") {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          }
        } else if (signal.type === "candidate") {
          if (peerRef.current && peerRef.current.remoteDescription) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.warn("Sender signaling handled safely:", err);
      }
    });
  }, [initSocket]);

  const sendFile = (fileObj, channel) => {
    return new Promise((resolve, reject) => {
      const metadata = { name: fileObj.name, size: fileObj.size, type: fileObj.type };
      channel.send(JSON.stringify({ type: "metadata", data: metadata }));

      let offset = 0;
      const reader = new FileReader();
      channel.bufferedAmountLowThreshold = 1024 * 1024;

      reader.onload = (e) => {
        try {
          if (channel.readyState !== "open") {
            throw new Error("WebRTC Channel dropped abruptly.");
          }

          channel.send(e.target.result);
          offset += CHUNK_SIZE;
          setProgress(Math.round((offset / fileObj.size) * 100));

          if (offset < fileObj.size) {
            if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
              channel.onbufferedamountlow = () => {
                channel.onbufferedamountlow = null;
                readSlice(offset); 
              };
            } else {
              readSlice(offset);
            }
          } else {
            channel.send(JSON.stringify({ type: "EOF" }));
            resolve(); 
          }
        } catch (err) {
          console.error("Failed to send chunk:", err);
          setP2pStatus("error");
          reject(err);
        }
      };

      const readSlice = (o) => {
        if (channel.readyState !== "open") return; 
        const slice = fileObj.slice(o, o + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };

      readSlice(0); 
    });
  };

  const joinSession = useCallback((stashKey) => {
    initSocket();
    stashKeyRef.current = stashKey;
    setP2pStatus("connecting");

    socketRef.current.off("signal");
    socketRef.current.off("room-full");

    socketRef.current.emit("join-room", stashKey);

    socketRef.current.on("room-full", () => {
      setP2pStatus("error");
      if (socketRef.current) {
        socketRef.current.off("signal");
        socketRef.current.off("room-full");
      }
      return; 
    });

    const peer = createPeerConnection(stashKey);
    peerRef.current = peer;

    peer.ondatachannel = (event) => {
      const channel = event.channel;
      channel.binaryType = "arraybuffer";

      channel.onmessage = (e) => {
        if (typeof e.data === "string") {
          const msg = JSON.parse(e.data);
          if (msg.type === "metadata") {
            fileDataRef.current.metadata = msg.data;
            fileDataRef.current.expectedSize = msg.data.size;
            fileDataRef.current.receivedSize = 0; 
            setProgress(0); 
            setP2pStatus("transferring");
          } else if (msg.type === "EOF") {
            downloadReconstructedFile();
          }
        } else {
          fileDataRef.current.receivedBuffers.push(e.data);
          fileDataRef.current.receivedSize += e.data.byteLength;
          setProgress(Math.round((fileDataRef.current.receivedSize / fileDataRef.current.expectedSize) * 100));
        }
      };
    };

    socketRef.current.on("signal", async (signal) => {
      // --- THE FIX: Clean up first, then set the error state ---
      if (signal.type === "cancel") {
        cleanupP2P();
        setP2pStatus("error");
        return;
      }

      try {
        if (signal.type === "offer") {
          if (peer.signalingState === "stable") {
            await peer.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socketRef.current.emit("signal", { stashKey, signal: answer });
          }
        } else if (signal.type === "candidate") {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.warn("Receiver signaling handled safely:", err);
      }
    });
  }, [initSocket]);

  const downloadReconstructedFile = () => {
    const { receivedBuffers, metadata } = fileDataRef.current;
    const blob = new Blob(receivedBuffers, { type: metadata.type });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = metadata.name;
    a.click();
    
    URL.revokeObjectURL(url);
    fileDataRef.current.receivedBuffers = []; 
    setP2pStatus("complete");
  };

  const cleanupP2P = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.off("signal");
      socketRef.current.off("peer-joined");
      socketRef.current.off("room-full");
    }
    
    stashKeyRef.current = "";
    fileDataRef.current = { receivedBuffers: [], expectedSize: 0, receivedSize: 0, metadata: null };
    setP2pStatus("idle");
    setProgress(0);
  }, []);

  const cancelTransfer = useCallback(() => {
    if (socketRef.current && stashKeyRef.current) {
      socketRef.current.emit("signal", { stashKey: stashKeyRef.current, signal: { type: "cancel" } });
    }
    cleanupP2P();
    setP2pStatus("error"); 
  }, [cleanupP2P]);

  return (
    <P2PContext.Provider value={{ startHosting, joinSession, p2pStatus, progress, cleanupP2P, cancelTransfer }}>
      {children}
    </P2PContext.Provider>
  );
};