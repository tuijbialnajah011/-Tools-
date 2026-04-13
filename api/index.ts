import express from "express";
import cors from "cors";
import { Readable } from "stream";

// Image proxy to handle sites with potentially expired/invalid certificates
// Note: Bypassing SSL verification is disabled to ensure applet sharing compatibility.
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

app.use(cors());
app.use(express.json());

// Enable SharedArrayBuffer for AI models
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Proxy route for downloading videos
app.get("/api/download", async (req, res) => {
  try {
    const videoUrl = req.query.url as string;
    const title = req.query.title as string || "video";

    if (!videoUrl) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Fetch the video from the source
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const contentLength = response.headers.get("content-length");

    // Set headers to force download
    res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4"`);
    res.setHeader("Content-Type", contentType);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    // Stream the response body to the client
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(500).json({ error: "Response body is empty" });
    }

  } catch (error: any) {
    console.error("Download proxy error:", error);
    res.status(500).json({ error: error.message || "Failed to download video" });
  }
});

// Proxy route for image search and fetching
app.get("/api/proxy-booru", async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).json({ error: "URL is required" });

    const urlObj = new URL(targetUrl);
    
    const fetchWithHeaders = async (url: string, headers: Record<string, string>) => {
      const urlObj = new URL(url);
      return await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": `${urlObj.protocol}//${urlObj.hostname}/`,
          ...headers
        }
      });
    };

    let response = await fetchWithHeaders(targetUrl, {});

    // If 401 (Unauthorized) or 403 (Forbidden), try fallbacks
    if (!response.ok && (response.status === 401 || response.status === 403)) {
      console.warn(`Booru primary fetch failed with ${response.status} for ${targetUrl}, trying fallback strategies...`);
      
      // Strategy 1: Try with a different User-Agent (Mobile)
      const mobileRes = await fetchWithHeaders(targetUrl, {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
      });
      
      if (mobileRes.ok) {
        response = mobileRes;
      } else {
        // Strategy 2: Try a public CORS proxy
        const fallbackProxies = [
          `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
          `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
          `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`
        ];

        for (const proxyUrl of fallbackProxies) {
          try {
            console.log(`Trying proxy: ${proxyUrl}`);
            const proxyRes = await fetch(proxyUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
              }
            });
            if (proxyRes.ok) {
              response = proxyRes;
              console.log("Proxy fallback succeeded!");
              break;
            }
          } catch (e) {
            console.warn(`Fallback proxy ${proxyUrl} failed`);
          }
        }
      }
    }

    if (!response.ok) {
      console.error(`Booru fetch failed: ${response.status} for ${targetUrl}`);
      if (response.status === 401) {
        return res.json([]); 
      }
      return res.status(response.status).json({ error: `Failed to fetch: ${response.status}` });
    }
    
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", contentType);
    res.send(text);
  } catch (error: any) {
    console.error("Proxy booru error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy route for generic API requests to bypass CORS
app.post("/api/proxy-request", async (req, res) => {
  try {
    const { url, method, headers, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const startTime = performance.now();
    const response = await fetch(url, {
      method: method || "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ...headers
      },
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });
    const endTime = performance.now();

    const contentType = response.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Convert headers to a plain object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
      time: Math.round(endTime - startTime)
    });

  } catch (error: any) {
    console.error("API Proxy error:", error);
    res.status(500).json({ error: error.message || "Failed to send request" });
  }
});

app.get("/api/search-duckduckgo", async (req, res) => {
  const keyword = req.query.q as string;
  
  if (!keyword) {
    return res.status(400).json({ error: "Keyword is required" });
  }

  try {
    // 1. Get VQD token
    const vqdRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(keyword)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const vqdText = await vqdRes.text();
    
    // More robust VQD extraction
    const vqdMatch = vqdText.match(/vqd[=:]\s*['"]?([^&'"]+)['"]?/) || vqdText.match(/vqd=['"]([^'"]+)['"]/);
    let vqd = vqdMatch ? vqdMatch[1] : null;

    if (!vqd) {
      console.error("Could not obtain VQD token from DuckDuckGo HTML");
      throw new Error("Could not obtain VQD token");
    }

    let allResults: any[] = [];
    let nextUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(keyword)}&o=json&p=1&s=0&u=1&f=,,,&vqd=${vqd}`;
    let debugLogs: string[] = [];
    
    // Fetch up to 3 pages (around 150 images) to prevent Vercel timeout
    for (let i = 0; i < 3; i++) {
      if (!nextUrl) {
        debugLogs.push(`Page ${i}: nextUrl is empty`);
        break;
      }
      
      let fetchUrl = nextUrl.startsWith('http') 
        ? nextUrl 
        : `https://duckduckgo.com${nextUrl.startsWith('/') ? '' : '/'}${nextUrl}`;
        
      if (!fetchUrl.includes('vqd=')) {
        fetchUrl += `&vqd=${vqd}`;
      }
      
      debugLogs.push(`Fetching page ${i}: ${fetchUrl}`);
        
      const ddgRes = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://duckduckgo.com/"
        }
      });

      if (!ddgRes.ok) {
        debugLogs.push(`Page ${i} failed: ${ddgRes.status}`);
        if (i === 0) throw new Error(`DuckDuckGo i.js failed: ${ddgRes.status}`);
        break;
      }

      const ddgData = await ddgRes.json();

      if (!ddgData || !ddgData.results || ddgData.results.length === 0) {
        debugLogs.push(`Page ${i} no results`);
        if (i === 0) throw new Error("No results from DuckDuckGo");
        break;
      }

      const pageResults = ddgData.results.map((r: any, idx: number) => ({
        id: `ddg-${i}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
        url: r.image,
        thumbnail: r.thumbnail,
        source: r.source || "DuckDuckGo",
        sourceUrl: r.url,
        title: r.title || keyword,
        width: r.width,
        height: r.height,
        type: 'Anime'
      }));
      
      allResults = [...allResults, ...pageResults];
      nextUrl = ddgData.next;
      debugLogs.push(`Page ${i} success, nextUrl: ${nextUrl}`);
    }

    return res.json({ results: allResults, debugLogs });

  } catch (error: any) {
    console.error("DuckDuckGo search failed, falling back to Qwant:", error);
    // Fallback to Qwant on any error
    try {
      let allQwantResults: any[] = [];
      
      // Fetch 4 pages of Qwant concurrently to save time
      const qwantPromises = Array.from({ length: 4 }, (_, i) => {
        const page = i + 1;
        const offset = (page - 1) * 50;
        const qwantUrl = `https://api.qwant.com/v3/search/images?count=50&q=${encodeURIComponent(keyword)}&t=images&safesearch=1&locale=en_US&offset=${offset}&device=desktop`;
        
        return fetch(qwantUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        }).then(res => res.ok ? res.json() : null).catch(() => null);
      });

      const qwantResults = await Promise.all(qwantPromises);
      
      qwantResults.forEach((qwantData, i) => {
        if (qwantData?.data?.result?.items) {
          const pageResults = qwantData.data.result.items.map((r: any, idx: number) => ({
            id: `qwant-fallback-${i}-${idx}`,
            url: r.media,
            thumbnail: r.thumbnail,
            source: "Qwant (Fallback)",
            sourceUrl: r.url,
            title: r.title || keyword,
            width: r.width,
            height: r.height,
            type: 'Anime'
          }));
          allQwantResults = [...allQwantResults, ...pageResults];
        }
      });
      
      if (allQwantResults.length > 0) {
        return res.json({ results: allQwantResults });
      }
    } catch (fallbackError) {
      console.error("Qwant fallback also failed:", fallbackError);
    }
    
    // Final fallback to Safebooru for anime images
    try {
      let keywordForBooru = keyword.replace(/anime pfp aesthetic/i, "").trim();
      if (!keywordForBooru) keywordForBooru = "avatar";
      
      const searchUrl = `https://safebooru.org/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(keywordForBooru)}&json=1&limit=100`;
      
      const searchRes = await fetch(searchUrl, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      
      if (searchRes.ok) {
        const textData = await searchRes.text();
        let data = [];
        if (textData.trim()) {
          try {
            data = JSON.parse(textData);
          } catch (e) {}
        }
        
        if (data && data.length > 0) {
          const results = data.map((r: any) => ({
            id: `safebooru-fallback-${r.id}`,
            url: r.file_url,
            thumbnail: r.preview_url || r.sample_url || r.file_url,
            source: "safebooru.org (Fallback)",
            sourceUrl: `https://safebooru.org/index.php?page=post&s=view&id=${r.id}`,
            title: r.tags,
            width: r.width,
            height: r.height,
            type: 'Anime'
          }));
          return res.json({ results });
        }
      }
    } catch (finalError) {
      console.error("Safebooru final fallback failed:", finalError);
    }

    // Ultimate fallback to Reddit if Safebooru also fails or returns empty
    try {
      const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&type=link&limit=100`;
      const redditRes = await fetch(redditUrl, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      
      if (redditRes.ok) {
        const redditData = await redditRes.json();
        const posts = redditData?.data?.children || [];
        
        const results = posts
          .filter((post: any) => {
            const url = post.data.url;
            return url && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg') || url.endsWith('.gif'));
          })
          .map((post: any) => ({
            id: `reddit-fallback-${post.data.id}`,
            url: post.data.url,
            thumbnail: post.data.thumbnail && post.data.thumbnail.startsWith('http') ? post.data.thumbnail : post.data.url,
            source: `r/${post.data.subreddit} (Fallback)`,
            sourceUrl: `https://reddit.com${post.data.permalink}`,
            title: post.data.title,
            width: 800,
            height: 800,
            type: 'Anime'
          }));
          
        if (results.length > 0) {
          return res.json({ results });
        }
      }
    } catch (redditError) {
      console.error("Reddit ultimate fallback failed:", redditError);
    }
    
    return res.status(500).json({ error: "Search failed across all providers." });
  }
});

app.get("/api/search-anime", async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    // Extract the actual keyword from the query (e.g., "miyabi anime pfp aesthetic" -> "miyabi")
    let keyword = query.replace(/anime pfp aesthetic/i, "").trim();
    if (!keyword) keyword = "avatar";

    // Use safebooru API as it doesn't block server IPs and has broader tags
    const searchUrl = `https://safebooru.org/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(keyword)}&json=1&limit=100`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      }
    });
    
    if (!searchRes.ok) {
      throw new Error(`Safebooru API failed: ${searchRes.status}`);
    }
    
    const textData = await searchRes.text();
    let data = [];
    if (textData.trim()) {
      try {
        data = JSON.parse(textData);
      } catch (e) {
        console.error("Failed to parse Safebooru response:", textData.substring(0, 100));
      }
    }
    
    const results = (data || []).map((r: any) => ({
      id: `safebooru-${r.id}`,
      url: r.file_url,
      thumbnail: r.preview_url || r.sample_url || r.file_url,
      source: "safebooru.org",
      sourceUrl: `https://safebooru.org/index.php?page=post&s=view&id=${r.id}`,
      title: r.tags,
      width: r.width,
      height: r.height,
      type: 'Anime'
    }));

    // Remove duplicates based on URL
    const uniqueResults = Array.from(new Map(results.map((item: any) => [item.url, item])).values());

    res.json({ results: uniqueResults });
  } catch (error: any) {
    console.error("Search error (safebooru):", error);
    res.status(500).json({ error: error.message || "Failed to search images" });
  }
});

app.get("/api/search-reddit", async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&type=link&limit=100`;
    const searchRes = await fetch(searchUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      }
    });
    
    if (!searchRes.ok) {
      throw new Error(`Reddit API failed: ${searchRes.status}`);
    }
    
    const data = await searchRes.json();
    
    const results: any[] = [];
    
    if (data && data.data && data.data.children) {
      for (const child of data.data.children) {
        const post = child.data;
        if (post && post.url && (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.jpeg'))) {
          let thumbnail = post.thumbnail;
          if (!thumbnail || thumbnail === 'self' || thumbnail === 'default' || thumbnail === 'image') {
            thumbnail = post.url;
          }
          
          results.push({
            id: `reddit-${post.id}`,
            url: post.url,
            thumbnail: thumbnail,
            source: `r/${post.subreddit}`,
            sourceUrl: `https://reddit.com${post.permalink}`,
            title: post.title,
            width: post.preview?.images?.[0]?.source?.width || 800,
            height: post.preview?.images?.[0]?.source?.height || 800,
            type: 'Reddit'
          });
        }
      }
    }
      
    res.json({ results });
  } catch (error: any) {
    console.error("Reddit search error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/image-proxy", async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send("URL is required");

    // Clean URL - handle potential double encoding
    let targetUrl = imageUrl;
    try {
      // If it's already encoded, decode it once to get a clean version, 
      // then we'll let fetch handle the encoding or use a clean URL object
      if (targetUrl.includes('%')) {
        targetUrl = decodeURIComponent(targetUrl);
      }
      targetUrl = new URL(targetUrl).href;
    } catch (e) {
      targetUrl = imageUrl; // Fallback to original if parsing fails
    }

    const fetchWithHeaders = async (url: string, headers: any) => {
      const controller = new AbortController();
      // Reduce timeout to 4s to prevent browser queue timeouts
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(url, { 
          headers,
          signal: controller.signal
        });
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const baseHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };

    let response: Response | null = null;
    let lastError: any = null;

    const tryStrategy = async (url: string, headers?: any) => {
      try {
        const res = await fetchWithHeaders(url, headers || baseHeaders);
        return res;
      } catch (e) {
        lastError = e;
        return null;
      }
    };

    // Strategy 1: Direct with Referer
    response = await tryStrategy(targetUrl, {
      ...baseHeaders,
      "Referer": new URL(targetUrl).origin
    });

    // Strategy 2: wsrv.nl (fastest public proxy)
    if (!response || !response.ok) {
      const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(targetUrl)}`;
      const nextRes = await tryStrategy(proxyUrl);
      if (nextRes && nextRes.ok) response = nextRes;
    }

    // Strategy 3: corsproxy.io
    if (!response || !response.ok) {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      const nextRes = await tryStrategy(proxyUrl);
      if (nextRes && nextRes.ok) response = nextRes;
    }

    if (!response || !response.ok) {
      const status = response ? response.status : "Unknown";
      const errorMsg = lastError ? lastError.message : "Failed to fetch";
      
      // If it's a known dead site or SSL error, redirect to a placeholder to avoid breaking the UI
      // Only do this if the request accepts images (e.g., from an <img> tag)
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('image/')) {
        console.log(`Image unavailable (${status}), serving placeholder for: ${targetUrl}`);
        const seed = encodeURIComponent(targetUrl.split('/').pop() || 'fallback');
        return res.redirect(302, `https://picsum.photos/seed/${seed}/400/600?blur=2`);
      }

      console.log(`All proxy strategies failed for ${targetUrl}. Status: ${status}, Error: ${errorMsg}`);
      return res.status(response ? response.status : 500).send(`Failed to fetch image: ${status}. ${errorMsg}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    
    if (req.query.download) {
      const filename = req.query.filename || 'download';
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    
    // Cache control
    res.setHeader("Cache-Control", "public, max-age=86400");

    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(500).send("Empty response body");
    }
  } catch (error: any) {
    console.warn(`Image proxy critical error for ${req.query.url}:`, error.message);
    res.status(500).send("Failed to load image");
  }
});

// Catch-all for API routes to debug Vercel routing
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Also handle the case where Vercel rewrites to /api/index
app.all("/api/index", (req, res) => {
  res.status(404).json({ error: `API route not found (rewritten to /api/index). Original URL: ${req.originalUrl}` });
});

export default app;
