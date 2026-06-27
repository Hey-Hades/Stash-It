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

      {/* CHANGED: Swapped h-dvh for min-h-screen, removed overflow-hidden, and changed w-screen to w-full */}
      <div className="flex min-h-screen w-full flex-col px-2 py-5 sm:px-10 md:px-20 md:py-10">
        <Nav />
        {/* CHANGED: Removed min-h-0 and overflow-y-auto so the box can grow naturally with zoom */}
        <main className="flex-1 flex flex-col w-full bg-neutral-950 font-mono p-4 rounded-2xl text-neutral-200 md:p-10">
          {sessionInfo.page === "main" ? <Main /> : <Download />}
        </main>
      </div>
      <SpeedInsights />
    </>
  );
}

export default App;