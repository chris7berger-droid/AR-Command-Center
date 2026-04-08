import { useEffect } from "react";
import { GLOBAL_CSS } from "./lib/tokens";
import { ARProvider, useAR } from "./lib/ARContext";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";

function AppInner() {
  const { customers, loaded, loadAll } = useAR();

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!loaded) return null;
  if (!customers.length) return <Upload />;
  return <Dashboard />;
}

export default function App() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <ARProvider>
      <AppInner />
    </ARProvider>
  );
}
