async function test() {
  const keyword = "naruto";
  const vqdRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(keyword)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  const vqdText = await vqdRes.text();
  const vqdMatch = vqdText.match(/vqd[=:]\s*['"]?([^&'"]+)['"]?/) || vqdText.match(/vqd=['"]([^'"]+)['"]/);
  const vqd = vqdMatch ? vqdMatch[1] : null;

  let allResults = [];
  let nextUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(keyword)}&o=json&p=1&s=0&u=1&f=,,,&vqd=${vqd}`;
  
  for (let i = 0; i < 6; i++) {
    if (!nextUrl) break;
    
    let fetchUrl = nextUrl.startsWith('http') 
      ? nextUrl 
      : `https://duckduckgo.com${nextUrl.startsWith('/') ? '' : '/'}${nextUrl}`;
      
    if (!fetchUrl.includes('vqd=')) {
      fetchUrl += `&vqd=${vqd}`;
    }
      
    console.log(`Fetching page ${i}: ${fetchUrl}`);
    const ddgRes = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://duckduckgo.com/"
      }
    });

    if (!ddgRes.ok) {
      console.log("Failed:", ddgRes.status);
      break;
    }

    const ddgData = await ddgRes.json();
    if (!ddgData || !ddgData.results || ddgData.results.length === 0) {
      console.log("No results");
      break;
    }

    allResults = [...allResults, ...ddgData.results];
    nextUrl = ddgData.next;
  }
  console.log("Total results:", allResults.length);
}
test();
