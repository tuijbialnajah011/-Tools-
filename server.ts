import express from "express";
import path from "path";
import fs from "fs";
import app from "./api/index.ts";

async function startServer() {
  const PORT = 3000;
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  const distPath = path.resolve(process.cwd(), 'dist');
  const indexPath = path.resolve(distPath, 'index.html');
  const isProduction = process.env.NODE_ENV === "production";

  console.log(`Static assets path: ${distPath}`);
  console.log(`Index file path: ${indexPath}`);

  // Vite middleware for development
  if (!isProduction && fs.existsSync(path.join(process.cwd(), 'vite.config.ts'))) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e: any) {
      console.warn("Vite not found, falling back to static serving.", e.message);
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send(`App is building or build not found. Index path: ${indexPath}`);
        }
      });
    }
  } else {
    // Serve static files but don't automatically serve index.html
    app.use(express.static(distPath, { index: false }));
    
    app.get('*all', (req, res) => {
      if (fs.existsSync(indexPath)) {
        // Prevent caching of index.html so updates are immediately visible
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error(`Error sending index.html: ${err.message}`);
            if (!res.headersSent) {
              res.status(500).send(`Internal Server Error: Could not serve index.html. Path: ${indexPath}`);
            }
          }
        });
      } else {
        const files = fs.existsSync(distPath) ? fs.readdirSync(distPath) : 'dist directory does not exist';
        console.error(`Index file not found at ${indexPath}. Files in dist: ${JSON.stringify(files)}`);
        res.status(404).send(`App is building or build not found. Please wait or run 'npm run build'. Path: ${indexPath}`);
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on 0.0.0.0:${PORT}`);
    console.log(`Production mode: ${isProduction}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
