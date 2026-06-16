import "./App.css";
import Main from "./components/Main";
import Nav from "./components/Nav";
import { Toaster } from "react-hot-toast";
import Download from "./components/Download";
import { useSessionContext } from "./contexts/SessionContext";
import { SpeedInsights } from "@vercel/speed-insights/react";
function App() {
  const { sessionInfo } = useSessionContext();
  return (
    <>
      <Toaster position="bottom-right" reverseOrder={false} />

      <div className="flex h-dvh w-screen flex-col overflow-hidden px-2 pt-5 sm:px-10 md:px-20">
        <Nav />
        <main className="min-h-0 flex-1 overflow-y-auto bg-neutral-950 font-mono p-4 rounded-2xl text-neutral-200 md:p-10">
          {sessionInfo.page === "main" ? <Main /> : <Download />}
        </main>
      </div>
      <SpeedInsights />
    </>
  );
}

export default App;
