import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// For ES module __dirname support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend build files (Vite outputs to dist by default)
app.use(express.static(path.join(__dirname, "../dist")));

// Handle all other routes by returning index.html (for React Router etc.)
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// Use Render-assigned port or fallback
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
