import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the built client files
app.use(express.static(path.join(__dirname, "../../dist/client")));

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "../../dist/client/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

