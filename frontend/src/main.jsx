import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { FileProvider } from "./contexts/FileContext.jsx";
import NetworkProvider from "./contexts/NetworkContext.jsx";
import { SessionProvider } from "./contexts/SessionContext.jsx";
import { KeyProvider } from "./contexts/KeyContext.jsx";
import { Analytics } from "@vercel/analytics/react";

// 1. IMPORT THE P2P PROVIDER HERE
import { P2PProvider } from "./contexts/P2PContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <NetworkProvider>
      <SessionProvider>
        <FileProvider>
          <KeyProvider>
            {/* 2. WRAP THE APP WITH P2P PROVIDER HERE */}
            <P2PProvider>
              <App />
              <Analytics />
            </P2PProvider>
          </KeyProvider>
        </FileProvider>
      </SessionProvider>
    </NetworkProvider>
  </StrictMode>
);