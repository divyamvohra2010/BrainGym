import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Get __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve built React files from dist/client (after vite build)
app.use(express.static(path.join(__dirname, "../client")));

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Render assigns PORT automatically
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
