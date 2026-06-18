export const formatBytes = (bytes) => {
  if (bytes < 1024) return { size: bytes + "B", valid: true };
  if (bytes < 1024 * 1024)
    return { size: (bytes / 1024).toFixed(1) + "Kb", valid: true };
  const size = (bytes / (1024 * 1024)).toFixed(1);
  const valid = size <= 50 ? true : false;
  return { size: size + "Mb", valid };
};

export const isValidStashKey = (stashKey) => {
  // --- P2P KEY BYPASS ---
  if (stashKey.startsWith("p2p-")) {
    return stashKey.length > 5; // Validates if it's at least 'p2p-X'
  }
  // ----------------------

  if (stashKey.length < 11) return false; 
  const keyComponents = stashKey.split("-"); 
  const len = keyComponents.length;
  if (len < 3) return false;
  if (keyComponents[len - 1].length !== 6) return false; 

  return true;
};

export const generateMetaData = (files) => {
  return files.map((file) => {
    if (file.fileInfo.formattedSize.valid) return file.fileInfo;
  });
};

export const convertToFile = (text, title) => {
  const blob = new Blob([text], { type: "text/plain" });
  const t = title.slice(-3) === "txt" ? title : title + ".txt";
  return new File([blob], t, { type: "text/plain" });
};

export const getDate = () => {
  const timeStamp = Date.now();
  const date = new Date(timeStamp);
  return `${date.getDate()}-${date.getMonth()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
};

export const isDocx = (type) => {
  return (
    type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
};