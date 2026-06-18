import { useFile } from "../contexts/FileContext";
import { useKey } from "../contexts/KeyContext";
import KeyHolder from "./KeyHolder";
import { useEffect } from "react";
import { useSessionContext } from "../contexts/SessionContext";

// --- THE FIX: Import the P2P Context so we can trigger the cleanup ---
import { useP2P } from "../contexts/P2PContext"; 

const NewRequest = () => {
  const { clearFiles, updateState, files, failedFiles } = useFile();
  const { key, removeKey } = useKey();
  
  const { setSessionInfo, transferMode } = useSessionContext();
  
  // Destructure cleanupP2P from the context
  const { cleanupP2P } = useP2P();

  useEffect(() => {
    if (transferMode === "cloud") {
      files.forEach((file) => {
        if (!["success", "uploading", "error"].includes(file.state.status)) {
          updateState({ status: "error" }, file.fileInfo.id);
        }
      });
    }
  }, [transferMode, files, updateState]);

  const handleNewRequest = () => {
    // --- THE FIX: Wipe the background WebRTC engine clean for the next transfer ---
    if (transferMode === "p2p") {
      cleanupP2P(); 
    }
    
    sessionStorage.removeItem("page");
    clearFiles();
    removeKey();
    setSessionInfo((prev) => ({
      ...prev,
      uploadStatus: "idle",
      newRequest: false,
    }));
  };

  const successCount = files.length - failedFiles.length;
  const isP2P = transferMode === "p2p";

  return (
    <div className="relative flex flex-col items-center justify-center space-y-4">
      
      <p className="text-green-400 text-sm sm:text-lg font-semibold">
        {isP2P ? "Direct Link Ready to Share!" : `Uploaded files ${successCount}/${files.length}!`}
      </p>

      {key && (isP2P || successCount > 0) && <KeyHolder />}

      <button
        onClick={handleNewRequest}
        className="px-4 py-2 bg-neutral-800 text-neutral-200 rounded-md hover:bg-neutral-700 transition"
      >
        Start New Request
      </button>
    </div>
  );
};

export default NewRequest;