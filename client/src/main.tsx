import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./components/Layout";

initTheme();

createRoot(document.getElementById("root")!).render(<App />);
