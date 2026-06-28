import { useEffect, useState } from "react";
import DownloadList from "./DownloadList";
import { useDownload } from "../hooks/UseDownload";
import { useDebounce } from "../hooks/UseDebounce";
import { useSessionContext } from "../contexts/SessionContext";
import { useP2P } from "../contexts/P2PContext"; 

const Download = () => {
  const [stashKey, setStashKey] = useState("");
  const { isLoading, error, sendRequest } = useDownload();
  const debouncedKey = useDebounce(stashKey, 1000);
  const { downloadUrls } = useSessionContext();

  const {
    joinSession,
    p2pStatus,
    progress,
    speed,
    eta,
    fileMetadata,
    cleanupP2P,
    cancelTransfer,
    role, // <-- NEW: Grab role from context
  } = useP2P();

  const handleInputKey = (event) => {
    setStashKey(event.target.value.trim());
  };

  useEffect(() => {
    if (!debouncedKey) return;

    if (debouncedKey.toLowerCase().startsWith("p2p-")) {
      const isValidP2PKey = /^p2p-[A-Z0-9]{6}$/i.test(debouncedKey);
      
      if (isValidP2PKey) {
        const normalizedKey = "p2p-" + debouncedKey.slice(4).toUpperCase();
        joinSession(normalizedKey);
      }
    } else {
      cleanupP2P(); 
      sendRequest(debouncedKey);
    }
  }, [debouncedKey, sendRequest, joinSession, cleanupP2P]);

  useEffect(() => {
    if (p2pStatus === "complete") {
      setStashKey("");
    }
  }, [p2pStatus]);

  // --- NEW: Only show P2P UI if the role is 'receiver' ---
  const isP2P = debouncedKey.toLowerCase().startsWith("p2p-") || (p2pStatus !== "idle" && role === "receiver");

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec) return "0 B/s";
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
  };

  const formatEta = (seconds) => {
    if (!seconds || !isFinite(seconds)) return "Calculating...";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center justify-center w-full ">
        <div className="flex items-center justify-center w-full md:w-[50%] ">
          <input
            type="text"
            placeholder="enter stash or p2p- key"
            onChange={handleInputKey}
            value={stashKey}
            className="
              flex-2 m-2 
              max-w-md w-full
              px-0
              py-2
              text-sm sm:text-base
              bg-transparent
              border-b
              border-neutral-700
              text-neutral-200
              placeholder-neutral-500
              focus:outline-none
              focus:border-green-400
              transition
              duration-200
              text-center
            "
          />
        </div>

        {!isP2P && (
          <div className="text-sm mb-2">
            {isLoading && <span className="text-neutral-600">Searching...</span>}
            {error && <span className="text-red-500">{error}</span>}
          </div>
        )}
      </div>

      {!isP2P && (
        <div>{downloadUrls && downloadUrls.length > 0 && <DownloadList />}</div>
      )}

      {isP2P && p2pStatus !== "idle" && (
        <div className="mt-8 w-full md:w-[80%] lg:w-[60%] mx-auto p-6 border border-neutral-700 rounded-md bg-neutral-900 text-center text-white shadow-lg">
          
          {/* Header only shows when active */}
          {(p2pStatus === "connecting" || p2pStatus === "transferring") && (
            <h3 className="text-lg font-bold mb-4 text-green-400">
              Direct Transfer Active
            </h3>
          )}
          
          {p2pStatus === "connecting" && (
            <p className="text-blue-400 animate-pulse text-sm">Connecting securely to sender...</p>
          )}
          
          {p2pStatus === "transferring" && (
            <div className="w-full">
               <div className="text-green-400 mb-3 w-full flex flex-col items-center">
                 <span className="truncate w-full block font-semibold px-2" title={fileMetadata?.name}>
                   {fileMetadata ? `Receiving: ${fileMetadata.name}` : "Receiving File"}
                 </span>
                 <span className="text-sm mt-1 font-medium text-green-300">
                   {fileMetadata ? `${formatBytes(fileMetadata.size)} • ` : ""}{progress}%
                 </span>
               </div>
               
               <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden border border-neutral-700">
                 <div 
                    className="bg-green-400 h-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                 ></div>
               </div>
               
               <div className="flex justify-between text-xs text-neutral-300 mt-3 px-1 font-mono">
                 <span>Speed: {formatSpeed(speed)}</span>
                 <span>ETA: {formatEta(eta)}</span>
               </div>
               
               <button 
                 onClick={cancelTransfer}
                 className="mt-4 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition duration-200"
               >
                 Cancel Download
               </button>

               <p className="text-xs text-neutral-400 mt-4">⚠️ Refresh and Regret :)</p>
            </div>
          )}
          
          {p2pStatus === "complete" && (
            <div className="py-2 flex flex-col items-center">
               <div className="bg-green-500/10 p-3 rounded-full mb-3">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                 </svg>
               </div>
               <p className="text-green-400 font-medium text-lg mb-1">Transfer Complete</p>
               <p className="text-xs text-neutral-400 max-w-[250px] mx-auto mb-4">
                 Your browser has automatically downloaded the file.
               </p>
               
               <button 
                 onClick={cleanupP2P}
                 className="px-4 py-1.5 border border-neutral-600 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-md transition duration-200"
               >
                 Receive Another File
               </button>
            </div>
          )}

          {/* Sleeker Error State (No Button) */}
          {p2pStatus === "error" && (
            <div className="py-2 flex flex-col items-center">
               <div className="bg-red-500/10 p-3 rounded-full mb-3">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </div>
               <p className="text-red-400 font-medium text-lg mb-1">Transfer Failed</p>
               <p className="text-xs text-neutral-400 max-w-[250px] mx-auto">
                 The sender disconnected, cancelled the transfer, or a network error occurred.
               </p>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};

export default Download;