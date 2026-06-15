import { useState, useRef } from "react";
import { Download } from "lucide-react";
import { PulseLoader } from "react-spinners";
import toast from "react-hot-toast";
import Modal from "./Modal";
import ProgressBar from "./ui/ProgressBar";
import { RenderPreview } from "./RenderPreview";
import { FileIcon } from "./ui/FileIcon";
import { useSessionContext } from "../contexts/SessionContext";

const DownloadList = () => {
  const [currFileDownloading, setCurrFileDownloading] = useState(null);
  const [progress, setProgress] = useState({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false); // 1. Added state for Download All
  const preview = useRef(null);
  const [open, setOpen] = useState(false);
  const { downloadUrls: files } = useSessionContext();

  const handlePreview = (file) => {
    if (file.id === currFileDownloading) return null;
    setOpen(true);
    preview.current = { type: file.type, url: file.downloadUrl };
  };

  const handleDownload = async (id) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;

    try {
      setCurrFileDownloading(file.id);
      setIsConnecting(true);
      setProgress({ id: file.id, percent: 0 });

      const res = await fetch(file.downloadUrl);
      if (!res.ok) throw new Error("failed to fetch file");

      const contentLength = res.headers.get("Content-Length");
      if (!contentLength) {
        console.warn("No content length headers, cannot track progress");
      } else {
        setIsConnecting(false);
      }

      const total = parseInt(contentLength, 10);
      let loaded = 0;

      const reader = res.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        if (total) {
          const percent = Math.round((loaded / total) * 100);
          setProgress((prev) => ({ ...prev, percent }));
        }
      }

      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || "download";
      document.body.appendChild(a);

      a.click();
      a.remove();

      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error(`Download failed: ${error.message}`);
      toast.error(`Download failed: ${error.message}`);
    } finally {
      setCurrFileDownloading(null);
      setProgress({});
      setIsConnecting(false);
    }
  };

  // 2. Uncommented and updated downloadAll function
  const downloadAll = async () => {
    setIsDownloadingAll(true);
    for (const file of files) {
      // The await here ensures they download one by one, updating the progress bar for each!
      await handleDownload(file.id); 
    }
    setIsDownloadingAll(false);
  };

  return (
    <div className="h-100 p-4 border-b border-neutral-900">
      
      {/* 3. Added the Download All Button (Only shows if there are multiple files) */}
      {files.length > 1 && (
        <div className="flex justify-center w-full mb-4">
          <div className="flex justify-end w-full lg:w-[70%]">
            <button
              type="button"
              onClick={downloadAll}
              disabled={isDownloadingAll || currFileDownloading !== null}
              className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-md hover:bg-neutral-800 hover:text-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingAll ? (
                <PulseLoader color="#c0c0c0ff" size={5} />
              ) : (
                <>
                  <Download size={16} />
                  Download All
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <ul className="flex flex-col items-center h-full overflow-auto">
        {files.map((file) => (
          <li
            key={file.id}
            className="relative w-full lg:w-[70%] flex items-center justify-between text-sm font-mono border-b p-4 border-neutral-900"
            onClick={() => handlePreview(file)}
          >
            <div className="min-w-0 w-full">
              <p className="truncate w-full max-w-[90%] text-neutral-300">
                {file.name}
              </p>
              <p className="flex gap-2 text-neutral-500">
                <span>{file.formattedSize.size}</span>
                <span className="flex items-center justify-center">
                  <FileIcon type={file.type} />
                </span>
              </p>
            </div>
            <span className="flex items-center justify-center">
              {currFileDownloading !== file.id ? (
                <button
                  type="button "
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file.id);
                  }}
                  disabled={currFileDownloading !== null} // Disabled while ANY file is downloading
                >
                  <Download color="#c0c0c0ff" size={20} />
                </button>
              ) : isConnecting ? (
                <PulseLoader color="#ffffff" size={5} />
              ) : (
                <span className="text-sm text-green-400">
                  {progress.percent}%
                </span>
              )}
            </span>
            {currFileDownloading === file.id && (
              <ProgressBar percent={progress.percent} />
            )}
          </li>
        ))}
      </ul>
      
      {open && (
        <Modal onClose={() => setOpen(false)} preview={true}>
          <RenderPreview preview={preview} setOpen={setOpen} />
        </Modal>
      )}
    </div>
  );
};

export default DownloadList;