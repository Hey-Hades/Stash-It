import { useSessionContext } from "../contexts/SessionContext";

const Nav = () => {
  const { sessionInfo, setSessionInfo } = useSessionContext();
  const setToUpload = () =>
    setSessionInfo((prev) => ({ ...prev, page: "main" }));
  const setToDownload = () =>
    setSessionInfo((prev) => ({ ...prev, page: "download" }));
  const underline = `absolute bottom-0 left-1/2 w-0 h-[2px] bg-black
      transform -translate-x-1/2 origin-center transition-all duration-300 ease-in-out `;
  return (
    <div className="font-monoton flex items-center gap-3 px-2 py-4 sm:px-4">
      <div className="min-w-0 flex-1 text-xl sm:text-2xl">
        <span className="block truncate">Stash It ..</span>
      </div>

      {/* Center Nav */}
      <div className="flex flex-1 justify-center">
        <ul className="flex cursor-pointer space-x-5 text-sm sm:space-x-6 sm:text-lg">
          <li className="relative group">
            <button type="button" onClick={setToUpload}>
              Upload
            </button>
            <span
              className={`${underline} ${
                sessionInfo.page === "main" ? "scale-x-100 w-full" : "scale-x-0"
              }`}
            />
          </li>
          <li className="relative group">
            <button type="button" onClick={setToDownload}>
              Download
            </button>
            <span
              className={`${underline} ${
                sessionInfo.page === "download"
                  ? "scale-x-100 w-full"
                  : "scale-x-0"
              }`}
            />
          </li>
        </ul>
      </div>

      {/* Right side empty spacer */}
      <div className="hidden flex-1 md:flex"></div>
    </div>
  );
};

export default Nav;
