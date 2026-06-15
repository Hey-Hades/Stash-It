import { useFile } from "../../contexts/FileContext";

const UploadMenu = ({ menuRef, fileInputRef, setShowModal }) => {
  const { files } = useFile();

  // Hide the menu if files are already added
  if (files && files.length > 0) return null;

  return (
    <div
      ref={menuRef}
      // 'top-full' places it directly below the button container
      // 'mt-2' adds a small gap so it looks 'connected' but not touching
      className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2"
    >
      <ul className="w-32 bg-neutral-900/90 backdrop-blur-md border border-neutral-700/50 text-white rounded-xl shadow-xl overflow-hidden animate-fadeIn p-1">
        <li
          className="px-3 py-2 flex items-center gap-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-all duration-200"
          onClick={() => fileInputRef.current.click()}
        >
          <span className="text-base">📁</span> 
          <span className="text-xs font-medium">Files</span>
        </li>
        <li
          className="px-3 py-2 flex items-center gap-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-all duration-200"
          onClick={() => setShowModal(true)}
        >
          <span className="text-base">📝</span> 
          <span className="text-xs font-medium">Text</span>
        </li>
      </ul>
    </div>
  );
};

export default UploadMenu;