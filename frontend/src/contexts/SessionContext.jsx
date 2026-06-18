import { createContext, useContext, useState } from "react";
import usePersistentState from "../hooks/UsePersistentState";

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [sessionInfo, setSessionInfo] = usePersistentState("sessionInfo", {
    uploadStatus: "idle",
    page: "main",
    newRequest: false,
    error: null,
  });
  const [requestState, setRequestState] = useState({
    status: "idle", //idle / connecting /connected
    error: null,
  });
  const [downloadUrls, setDownloadUrls] = useState([]);
  
  // ADDED: Track which transfer mode the user has selected
  const [transferMode, setTransferMode] = useState("cloud"); // "cloud" | "p2p"

  return (
    <SessionContext.Provider
      value={{
        sessionInfo,
        setSessionInfo,
        downloadUrls,
        setDownloadUrls,
        requestState,
        setRequestState,
        // ADDED: Pass the new state and setter to the context
        transferMode,
        setTransferMode,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => {
  return useContext(SessionContext);
};