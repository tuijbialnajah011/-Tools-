async function test() {
  const res = await fetch('http://localhost:3000/api/search-duckduckgo?q=naruto');
  const data = await res.json();
  if (data.results) {
    console.log("Total results:", data.results.length);
    
    const seenHashes = new Set();
    const seenThumbIds = new Set();
    const uniqueResults = data.results.filter(img => {
      const hash = img.url.split('?')[0].toLowerCase();
      
      let thumbId = img.thumbnail;
      try {
        const urlObj = new URL(img.thumbnail);
        const idParam = urlObj.searchParams.get('id');
        if (idParam) thumbId = idParam;
      } catch (e) {}
      
      if (seenHashes.has(hash) || seenThumbIds.has(thumbId)) {
        return false;
      }
      
      seenHashes.add(hash);
      seenThumbIds.add(thumbId);
      return true;
    });
    
    console.log("Unique results:", uniqueResults.length);
  }
}
test();
