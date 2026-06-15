import { useFile } from "../../contexts/FileContext";

const UploadMenu = ({ menuRef, fileInputRef, setShowModal }) => {
  const { files } = useFile();

  // Hide menu when files already exist
  if (files && files.length > 0) return null;

  return (
    <div
      ref={menuRef}
      className="
        fixed
        bottom-56
        left-1/2
        -translate-x-1/2
        z-50

        md:absolute
        md:top-full
        md:bottom-auto
        md:left-1/2
        md:-translate-x-1/2
        md:mt-1
      "
    >
      <ul className="w-40 md:w-32 bg-neutral-900/90 backdrop-blur-md border border-neutral-700/50 text-white rounded-xl shadow-xl overflow-hidden animate-fadeIn p-1">
        <li
          className="px-4 py-3 md:px-3 md:py-2 flex items-center gap-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-all duration-200"
          onClick={() => fileInputRef.current.click()}
        >
          <span className="text-base">📁</span>
          <span className="text-sm md:text-xs font-medium">Files</span>
        </li>

        <li
          className="px-4 py-3 md:px-3 md:py-2 flex items-center gap-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-all duration-200"
          onClick={() => setShowModal(true)}
        >
          <span className="text-base">📝</span>
          <span className="text-sm md:text-xs font-medium">Text</span>
        </li>
      </ul>
    </div>
  );
};

export default UploadMenu;