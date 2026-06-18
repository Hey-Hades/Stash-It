import { useEffect, useState } from "react";
import DownloadList from "./DownloadList";
import { useDownload } from "../hooks/UseDownload";
import { useDebounce } from "../hooks/UseDebounce";
import { useSessionContext } from "../contexts/SessionContext";

// IMPORTANT: Import useP2P from the new Context
import { useP2P } from "../contexts/P2PContext"; 

const Download = () => {
  const [stashKey, setStashKey] = useState("");
  const { isLoading, error, sendRequest } = useDownload();
  const debouncedKey = useDebounce(stashKey, 1000);
  const { downloadUrls } = useSessionContext();

  // Initialize P2P Receiver State and destructure cancelTransfer
  const { joinSession, p2pStatus, progress, cleanupP2P, cancelTransfer } = useP2P();

  const handleInputKey = (event) => {
    setStashKey(event.target.value.trim());
  };

  useEffect(() => {
    if (!debouncedKey) return;

    if (debouncedKey.startsWith("p2p-")) {
      // Direct Link logic
      joinSession(debouncedKey);
    } else {
      // Cloud Stash logic: clear out any lingering P2P state if they switch to cloud
      cleanupP2P(); 
      sendRequest(debouncedKey);
    }
    
    // Cleanup function omitted intentionally to allow background transfer during tab switching
  }, [debouncedKey, sendRequest, joinSession, cleanupP2P]);

  // Checks if a transfer is actively running in the background, keeping the UI visible!
  const isP2P = debouncedKey.startsWith("p2p-") || p2pStatus !== "idle";

  return (
    <div className="w-full">
      <div className="flex flex-col items-center justify-center w-full ">
        <div className="flex items-center justify-center w-full md:w-[50%] ">
          <input
            type="text"
            placeholder="enter-stash-key"
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
            {isLoading && <span className="text-neutral-600">Searching ...</span>}
            {error && <span className="text-red-500">{error}</span>}
          </div>
        )}
      </div>

      {!isP2P && (
        <div>{downloadUrls && downloadUrls.length > 0 && <DownloadList />}</div>
      )}

      {/* P2P DIRECT TRANSFER UI */}
      {isP2P && p2pStatus !== "idle" && (
        <div className="mt-8 w-full md:w-[80%] lg:w-[60%] mx-auto p-6 border border-neutral-700 rounded-md bg-neutral-900 text-center text-white shadow-lg">
          
          {/* Dynamic Header: Turns red on error, green otherwise */}
          <h3 className={`text-lg font-bold mb-4 ${p2pStatus === "error" ? "text-red-400" : "text-green-400"}`}>
            {p2pStatus === "error" ? "Transfer Canceled" : "Direct Transfer Active"}
          </h3>
          
          {p2pStatus === "connecting" && (
            <p className="text-blue-400 animate-pulse text-sm">Connecting securely to sender...</p>
          )}
          
          {p2pStatus === "transferring" && (
            <div className="w-full">
               <p className="text-green-400 mb-2 font-semibold">Receiving File: {progress}%</p>
               <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden border border-neutral-700">
                 <div 
                    className="bg-green-400 h-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                 ></div>
               </div>
               
               {/* --- THE CANCEL BUTTON --- */}
               <button 
                 onClick={cancelTransfer}
                 className="mt-4 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition duration-200"
               >
                 Cancel Download
               </button>
               {/* ------------------------- */}

               <p className="text-xs text-neutral-400 mt-4">⚠️ Do not close this tab until the download is complete.</p>
            </div>
          )}
          
          {p2pStatus === "complete" && (
            <div className="py-4">
               <p className="text-green-400 font-bold text-xl mb-2">File Received!</p>
               <p className="text-sm text-neutral-400">Your browser has automatically downloaded the file.</p>
            </div>
          )}

          {/* --- THE ERROR BLOCK --- */}
          {p2pStatus === "error" && (
            <div className="py-4">
               <p className="text-red-400 font-bold text-xl mb-2">❌ Transfer Canceled</p>
               <p className="text-sm text-neutral-400">
                 The sender disconnected, canceled the transfer, or the link is invalid/in-use.
               </p>
            </div>
          )}
          {/* --------------------------- */}
          
        </div>
      )}
    </div>
  );
};

export default Download;