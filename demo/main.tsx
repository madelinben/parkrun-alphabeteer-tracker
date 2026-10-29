import { createRoot } from "react-dom/client";
import { AlphabeteerApp } from "../src";
import "./demo.css";

createRoot(document.getElementById("root") as HTMLElement).render(<AlphabeteerApp />);
