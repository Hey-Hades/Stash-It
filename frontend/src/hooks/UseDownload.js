import { useCallback, useState } from "react";
import axios from "axios";
import { isValidStashKey } from "../utils/utils";
import { useSessionContext } from "../contexts/SessionContext";
import { apiUrl } from "../utils/api";

export const useDownload = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setDownloadUrls } = useSessionContext();

  const sendRequest = useCallback(async (stashKey) => {
    // 1. See what key is actually reaching this function
    console.log("1. Hook received key:", `"${stashKey}"`);
    
    // 2. See if the validation function is approving or rejecting it
    const isValid = isValidStashKey(stashKey);
    console.log("2. Is the key valid?", isValid);

    if (isValid) {
      const url = apiUrl("/api/file/download");
      console.log("3. Sending request to URL:", url);

      setIsLoading(true);
      setError(null);

      try {
        const res = await axios.get(url, { params: { stashKey } });
        const { downloadUrls } = await res.data;
        console.log("4. Download success! Data:", downloadUrls);

        setData(downloadUrls);
        setDownloadUrls(downloadUrls);
        setIsLoading(false);
      } catch (error) {
        console.log("4. Download failed with error:", error);
        if (axios.isAxiosError(error)) {
          if (error.response) {
            console.error("Error status:", error.response.status);
            setError(error.response.data.message);
          } else if (error.request) {
            console.error("No response received:", error.request);
            setError("No response received from backend");
          } else {
            setError(error.message);
          }
        } else {
          setError("Unexpected error");
        }
        setIsLoading(false);
      }
    } else {
       console.log("-> Request blocked because isValidStashKey returned false.");
    }
  }, []);

  return { data, isLoading, error, sendRequest };
};
