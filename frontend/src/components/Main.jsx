import AddFile from "./AddFile";
import { useFile } from "../contexts/FileContext";
import NewRequest from "./NewRequest";
import { PulseLoader } from "react-spinners";
import { useUpload } from "../hooks/UseUpload";
import ExpiresIn from "./ExpiresIn";
import { useRetry } from "../hooks/UseRetry";
import { useSessionContext } from "../contexts/SessionContext";
import FileList from "./FileList";

// Import Key context
import { useKey } from "../contexts/KeyContext";
// FIX: Pull useP2P from the global Context wrapper to allow tab switching!
import { useP2P } from "../contexts/P2PContext"; 

const Main = () => {
  const {
    files,
    expiry,
    setExpiry,
    updateState,
    findFailedFiles,
    failedFiles,
  } = useFile();
  const { sendRequest, uploadAllFiles, requestState, uploadState } =
    useUpload();
  const { retryRequest, isConnecting } = useRetry();
  
  // Destructure the new transferMode state and setSessionInfo
  const { sessionInfo, setSessionInfo, transferMode, setTransferMode } = useSessionContext();
  
  // Initialize P2P and Key hooks from Context
  const { addKey } = useKey();
  const { startHosting, p2pStatus, progress, cancelTransfer } = useP2P();
  const isCloudSizeExceeded =
  transferMode === "cloud" &&
  files.some((file) => file.fileObj.size > 50 * 1024 * 1024);

  const startUpload = async () => {
  if (isCloudSizeExceeded) return;
  
    // --- P2P DIRECT LINK LOGIC ---
    if (transferMode === "p2p") {
      setSessionInfo((prev) => ({ ...prev, uploadStatus: "uploading" }));
      
      // Generate a local 6-character key and append the prefix
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const p2pKey = `p2p-${randomStr}`;
      
      // Extract the raw File objects from your file context state
      const filesToTransfer = files.map(f => f.fileObj);
      
      // Start the WebRTC socket listener
      startHosting(p2pKey, filesToTransfer);
      
      // Add the key to context so the NewRequest/KeyHolder components display it
      addKey(p2pKey);
      
      // Shift UI to the Key generated view
      sessionStorage.setItem("page", "newRequest");
      setSessionInfo((prev) => ({ ...prev, uploadStatus: "finished", newRequest: true }));

    } 
    // --- EXISTING CLOUD STASH LOGIC ---
    else {
      if (sessionInfo.uploadStatus !== "uploading") {
        const uploadUrls = await sendRequest();
        if (uploadUrls) {
          await uploadAllFiles(uploadUrls);
          sessionStorage.setItem("page", "newRequest");
        }
      } else {
        retry(files);
      }
    }
  };

  const updateInvalidUrls = async (files) => {
    const usedLinkFiles = files.filter((f) => f.state.progress > 0);
    const pathArr = usedLinkFiles.map((f) => ({
      path: f.state.path,
      id: f.fileInfo.id,
    }));
    const retryUrls = await retryRequest(pathArr);
    for (const url of retryUrls) {
      updateState({ uploadUrl: url.uploadUrl }, url.id);
    }
  };

  const retry = async (files) => {
    let updatedFiles = files.filter((f) => f.state.status !== "success");
    const retryUrls = [];
    await updateInvalidUrls(updatedFiles);
    for (const file of updatedFiles) {
      retryUrls.push({ uploadUrl: file.state.uploadUrl, id: file.fileInfo.id });
    }
    await uploadAllFiles(retryUrls);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-start pb-28 md:justify-center md:pb-0">
      <div className="hidden flex-shrink-0 md:flex">
        {sessionInfo.uploadStatus === "idle" && <AddFile />}
      </div>
      <div className="w-full min-w-0 md:w-[80%]">
        <div>
          <FileList retry={retry} />
          
          {/* UI TOGGLE SECTION */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
            
            {/* CONDITIONAL EXPIRY RENDER */}
            {transferMode === "cloud" ? (
              <ExpiresIn value={expiry} onChange={setExpiry} />
            ) : (
              <div className="py-2 px-3 rounded-md border border-neutral-700 bg-neutral-900 text-xs text-neutral-400">
                ⚡ Real-time Transfer
              </div>
            )}
            
            {/* Transfer Mode Toggle Switch */}
            {!sessionInfo.newRequest && (
              <div className="flex bg-neutral-900 p-1 rounded-md border border-neutral-700">
                <button
                  onClick={() => setTransferMode("cloud")}
                  className={`px-4 py-1.5 text-xs sm:text-sm rounded transition-all duration-300 ${
                    transferMode === "cloud" ? "bg-white text-black font-semibold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Cloud Stash
                </button>
                <button
                  onClick={() => setTransferMode("p2p")}
                  className={`px-4 py-1.5 text-xs sm:text-sm rounded transition-all duration-300 ${
                    transferMode === "p2p" ? "bg-white text-black font-semibold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Direct Link (P2P)
                </button>
              </div>
            )}

            <div>
              {sessionInfo.newRequest && failedFiles.length > 0 && transferMode === "cloud" && (
                <button
                  type="button"
                  className="py-2 px-6 bg-neutral-900 text-xs sm:text-sm text-white rounded-md overflow-hidden hover:bg-white hover:text-black transition-all duration-300"
                  onClick={() => retry(failedFiles)}
                  disabled={isConnecting || uploadState.uploading}
                >
                  {isConnecting ? (
                    <PulseLoader size={5} color="#fff" />
                  ) : (
                    "Retry All"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex mt-4">
          <div className="flex-1">
            {files.length > 0 && !sessionInfo.newRequest && (
              <button
  type="button"
  className={`relative py-2 px-6 rounded-md overflow-hidden transition-all duration-300 w-full sm:w-auto border ${
    isCloudSizeExceeded
      ? "bg-red-900/40 border-red-600 text-red-300 cursor-not-allowed"
      : `bg-neutral-900 text-white border-black ${
          requestState.status === "idle"
            ? "hover:bg-white hover:text-black"
            : ""
        }`
  }`}
  disabled={
    isCloudSizeExceeded ||
    ((requestState.status !== "idle" && transferMode === "cloud") ||
      uploadState.uploading)
  }
  onClick={() => startUpload()}
>
  {isCloudSizeExceeded ? (
    "Upload files 50MB or less"
  ) : requestState.status === "idle" || transferMode === "p2p" ? (
    "Upload"
  ) : requestState.status === "connecting" ? (
    <PulseLoader size={5} color="#fff" />
  ) : (
    "Connected"
  )}
</button>
            )}
          </div>
        </div>

        {sessionInfo.newRequest && (
          <>
            <NewRequest />
            
            {/* P2P Live Status Indicator below the Key */}
            {transferMode === "p2p" && (
              <div className="mt-6 p-4 border border-neutral-700 rounded-md bg-neutral-900 text-center text-white">
                <h3 className="text-md sm:text-lg font-bold mb-2">P2P Direct Transfer</h3>
                
                {p2pStatus === "waiting" && (
                  <div className="flex flex-col items-center">
                    <p className="text-yellow-400 animate-pulse text-sm">Waiting for receiver to enter key...</p>
                    <button 
                      onClick={cancelTransfer}
                      className="mt-4 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition duration-200"
                    >
                      Cancel Transfer
                    </button>
                  </div>
                )}
                
                {p2pStatus === "connecting" && (
                  <p className="text-blue-400 text-sm">Connecting to peer...</p>
                )}
                
                {p2pStatus === "transferring" && (
                  <div className="w-full max-w-md mx-auto">
                     <p className="text-green-400 mb-2 text-sm font-semibold">Transferring: {progress}%</p>
                     <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden border border-neutral-700">
                       <div className="bg-green-400 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                     </div>
                     <button 
                       onClick={cancelTransfer}
                       className="mt-4 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition duration-200"
                     >
                       Cancel Transfer
                     </button>
                  </div>
                )}
                
                {p2pStatus === "complete" && (
                  <p className="text-green-400 font-bold">Transfer Complete!</p>
                )}

                {/* --- SENDER ERROR BLOCK --- */}
                {p2pStatus === "error" && (
                  <div className="py-2 text-red-400 font-bold">
                    <p>❌ Transfer Canceled!</p>
                    <p className="text-xs text-neutral-400 mt-1 font-normal">The connection was closed or dropped.</p>
                  </div>
                )}
                {/* -------------------------- */}
                
                {p2pStatus !== "complete" && p2pStatus !== "error" && (
                  <p className="text-xs text-gray-400 mt-4">
                    ⚠️ Keep this tab open until the transfer completes.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Mobile floating action button */}
      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 md:hidden">
        {sessionInfo.uploadStatus === "idle" && <AddFile />}
      </div>
    </div>
  );
};

export default Main;