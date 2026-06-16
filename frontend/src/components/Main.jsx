import AddFile from "./AddFile";
import { useFile } from "../contexts/FileContext";
import NewRequest from "./NewRequest";
import { PulseLoader } from "react-spinners";
import { useUpload } from "../hooks/UseUpload";
import ExpiresIn from "./ExpiresIn";
import { useRetry } from "../hooks/UseRetry";
import { useSessionContext } from "../contexts/SessionContext";
import FileList from "./FileList";
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
  const { sessionInfo } = useSessionContext();

  const startUpload = async () => {
    if (sessionInfo.uploadStatus !== "uploading") {
      const uploadUrls = await sendRequest();
      if (uploadUrls) {
        await uploadAllFiles(uploadUrls);
        sessionStorage.setItem("page", "newRequest");
      }
    } else {
      retry(files);
    }
  };

  const updateInvalidUrls = async (files) => {
    //only get retry url of ones which are partially used
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
    console.log("retrying");
    let updatedFiles = files.filter((f) => f.state.status !== "success");
    console.log(updatedFiles);
    //expetcs an array

    const retryUrls = [];
    await updateInvalidUrls(updatedFiles);
    for (const file of updatedFiles) {
      retryUrls.push({ uploadUrl: file.state.uploadUrl, id: file.fileInfo.id });
    }
    await uploadAllFiles(retryUrls);
    console.log("done");
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-start pb-28 md:justify-center md:pb-0">
      <div className="hidden flex-shrink-0 md:flex">
        {sessionInfo.uploadStatus === "idle" && <AddFile />}
      </div>
      <div className="w-full min-w-0 md:w-[80%]">
        <div>
          <FileList retry={retry} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <ExpiresIn value={expiry} onChange={setExpiry} />
            <div>
              {sessionInfo.newRequest && failedFiles.length > 0 && (
                <button
                  type="button"
                  className="py-2 px-6 bg-neutral-900 text-xs sm:text-sm text-white rounded-md overflow-hidden hover:bg-white hover:text-black
                   transition-all duration-300"
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
                className={`relative py-2 px-6 bg-neutral-900 text-white rounded-md overflow-hidden 
                   transition-all duration-300 ${
                     requestState.status === "idle"
                       ? "hover:bg-white hover:text-black"
                       : ""
                   }
                   border border-black`}
                disabled={
                  requestState.status !== "idle" || uploadState.uploading
                }
                onClick={() => startUpload()}
              >
                {requestState.status === "idle" ? (
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
          </>
        )}
      </div>
      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 md:hidden">
        {sessionInfo.uploadStatus === "idle" && <AddFile />}
      </div>
    </div>
  );
};

export default Main;
