import { createContext, useContext, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { apiUrl } from "../utils/api";

const CHUNK_SIZE = 256 * 1024;

const P2PContext = createContext();

export const useP2P = () => useContext(P2PContext);

export const P2PProvider = ({ children }) => {
  const [p2pStatus, setP2pStatus] = useState("idle"); 
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);
  const [fileMetadata, setFileMetadata] = useState(null); 
  
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const stashKeyRef = useRef(""); 
  
  const fileDataRef = useRef({ 
    receivedBuffers: [], 
    expectedSize: 0, 
    receivedSize: 0, 
    metadata: null, 
    startTime: 0 
  });
  
  const pendingCandidatesRef = useRef([]);

  const initSocket = useCallback(() => {
    if (!socketRef.current) {
      const socketUrl = apiUrl("").replace("/api", ""); 
      socketRef.current = io(socketUrl); 
    } else if (socketRef.current.disconnected) {
      socketRef.current.connect();
    }
  }, []);

  const createPeerConnection = (stashKey) => {
    const iceServers = [
      {
        urls: [
          "stun:free.expressturn.com:3478",
          "turn:free.expressturn.com:3478?transport=udp",
          "turn:free.expressturn.com:3478?transport=tcp",
          "turn:free.expressturn.com:80?transport=tcp",
          "turn:free.expressturn.com:443?transport=tcp",
        ],
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_PASSWORD,
      },
    ];

    const peer = new RTCPeerConnection({ iceServers });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("signal", { stashKey, signal: { type: "candidate", candidate: event.candidate } });
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", peer.iceConnectionState);
      if (peer.iceConnectionState === "failed") {
        setP2pStatus("error");
      }
    };

    peer.onconnectionstatechange = () => {
      console.log("Overall Connection State:", peer.connectionState);
      if (peer.connectionState === "connected") {
        setP2pStatus("transferring");
      }
      if (peer.connectionState === "failed" || peer.connectionState === "closed") {
        setP2pStatus("error");
      }
    };

    return peer;
  };

  const startHosting = useCallback((stashKey, filesToSend) => {
    initSocket();
    stashKeyRef.current = stashKey;
    setP2pStatus("waiting");
    pendingCandidatesRef.current = [];

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

      channel.onerror = (err) => {
        console.error("DataChannel error:", err);
        setP2pStatus("error");
      };

      channel.onclose = () => {
        console.log("DataChannel closed");
      };

      channel.onopen = async () => {
        setP2pStatus("transferring");
        
        try {
          for (const file of filesToSend) {
            await sendFile(file, channel);
          }
          setP2pStatus("complete");
        } catch (err) {
          console.error("Transfer interrupted:", err);
          setP2pStatus("error");
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socketRef.current.emit("signal", { stashKey, signal: offer });
    });

    socketRef.current.on("signal", async (signal) => {
      if (signal.type === "cancel") {
        cleanupP2P();
        setP2pStatus("error");
        return;
      }

      try {
        if (signal.type === "answer") {
          if (peerRef.current && peerRef.current.signalingState !== "stable") {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
            
            const pending = pendingCandidatesRef.current;
            pendingCandidatesRef.current = [];
            for (const candidate of pending) {
              await peerRef.current.addIceCandidate(candidate);
            }
          }
        } else if (signal.type === "candidate" && signal.candidate) {
          const candidate = new RTCIceCandidate(signal.candidate);
          if (peerRef.current && peerRef.current.remoteDescription) {
            await peerRef.current.addIceCandidate(candidate);
          } else {
            pendingCandidatesRef.current.push(candidate);
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
      let lastPercent = -1;
      const reader = new FileReader();
      channel.bufferedAmountLowThreshold = 8 * 1024 * 1024;

      reader.onerror = (err) => {
        console.error("FileReader failed:", err);
        setP2pStatus("error");
        reject(err);
      };

      reader.onload = (e) => {
        try {
          if (channel.readyState !== "open") {
            throw new Error("WebRTC Channel dropped abruptly.");
          }

          channel.send(e.target.result);
          offset += CHUNK_SIZE;
          const percent = Math.floor((offset / fileObj.size) * 100);

          if (percent !== lastPercent) {
            setProgress(percent);
            lastPercent = percent;
          }

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
            if (channel.readyState === "open") {
              channel.send(JSON.stringify({ type: "EOF" }));
            }
            setProgress(100);
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
    pendingCandidatesRef.current = [];

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

      let lastPercent = 0;
      let lastUpdateTime = Date.now();

      channel.onerror = (err) => {
        console.error("DataChannel error:", err);
        setP2pStatus("error");
      };

      channel.onclose = () => {
        console.log("DataChannel closed");
      };

      channel.onmessage = (e) => {
        if (typeof e.data === "string") {
          const msg = JSON.parse(e.data);
          if (msg.type === "metadata") {
            fileDataRef.current.metadata = msg.data;
            fileDataRef.current.expectedSize = msg.data.size;
            fileDataRef.current.receivedBuffers = []; 
            fileDataRef.current.receivedSize = 0; 
            fileDataRef.current.startTime = Date.now(); 
            
            // --- UPDATED: Optimized State Sequence ---
            setFileMetadata(msg.data);
            setProgress(0); 
            setSpeed(0);
            setEta(0);
            setP2pStatus("transferring"); 
            // -----------------------------------------
            
            lastPercent = 0;
            lastUpdateTime = Date.now();
          } else if (msg.type === "EOF") {
            setSpeed(0); 
            setEta(0);   
            downloadReconstructedFile();
          }
        } else {
          fileDataRef.current.receivedBuffers.push(e.data);
          fileDataRef.current.receivedSize += e.data.byteLength;
          
          const now = Date.now();
          const { receivedSize, expectedSize, startTime } = fileDataRef.current;

          const newPercent = Math.round((receivedSize / expectedSize) * 100);
          if (newPercent > lastPercent) {
            setProgress(newPercent);
            lastPercent = newPercent;
          }

          if (now - lastUpdateTime > 500) {
            const elapsedSeconds = (now - startTime) / 1000;
            if (elapsedSeconds > 0) {
              const currentSpeed = receivedSize / elapsedSeconds;
              const remainingBytes = expectedSize - receivedSize;
              const currentEta = remainingBytes / currentSpeed;
              
              setSpeed(currentSpeed);
              setEta(currentEta);
            }
            lastUpdateTime = now;
          }
        }
      };
    };

    socketRef.current.on("signal", async (signal) => {
      if (signal.type === "cancel") {
        cleanupP2P();
        setP2pStatus("error");
        return;
      }

      try {
        if (signal.type === "offer") {
          if (peer.signalingState === "stable") {
            await peer.setRemoteDescription(new RTCSessionDescription(signal));
            
            const pending = pendingCandidatesRef.current;
            pendingCandidatesRef.current = [];
            for (const candidate of pending) {
              await peer.addIceCandidate(candidate);
            }

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socketRef.current.emit("signal", { stashKey, signal: answer });
          }
        } else if (signal.type === "candidate" && signal.candidate) {
          const candidate = new RTCIceCandidate(signal.candidate);
          if (peer.remoteDescription) {
            await peer.addIceCandidate(candidate);
          } else {
            pendingCandidatesRef.current.push(candidate);
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
    
    fileDataRef.current = { receivedBuffers: [], expectedSize: 0, receivedSize: 0, metadata: null, startTime: 0 };
    setP2pStatus("complete");
  };

  const cleanupP2P = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.onopen = null;
      channelRef.current.onmessage = null;
      channelRef.current.onerror = null;
      channelRef.current.onclose = null;
      channelRef.current.close();
      channelRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.onicecandidate = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.oniceconnectionstatechange = null;
      peerRef.current.ondatachannel = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.off("signal");
      socketRef.current.off("peer-joined");
      socketRef.current.off("room-full");
    }
    
    stashKeyRef.current = "";
    pendingCandidatesRef.current = [];
    fileDataRef.current = { receivedBuffers: [], expectedSize: 0, receivedSize: 0, metadata: null, startTime: 0 };
    
    setP2pStatus("idle");
    setProgress(0);
    setSpeed(0); 
    setEta(0);   
    setFileMetadata(null); 
  }, []);

  const cancelTransfer = useCallback(() => {
    if (socketRef.current && stashKeyRef.current) {
      socketRef.current.emit("signal", { stashKey: stashKeyRef.current, signal: { type: "cancel" } });
    }
    cleanupP2P();
    setP2pStatus("error"); 
  }, [cleanupP2P]);

  return (
    <P2PContext.Provider value={{ 
      startHosting, 
      joinSession, 
      p2pStatus, 
      progress, 
      speed,      
      eta,
      fileMetadata,
      cleanupP2P, 
      cancelTransfer 
    }}>
      {children}
    </P2PContext.Provider>
  );
};