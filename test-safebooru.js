import fetch from 'node-fetch';

async function test() {
  const query = "miyabi";
  const targetUrl = `https://safebooru.donmai.us/posts.json?tags=${encodeURIComponent(query)}`;
  const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    }
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Results start:", text.substring(0, 200));
}

test();
