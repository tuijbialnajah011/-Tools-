async function test() {
  const res = await fetch('http://localhost:3000/api/search-duckduckgo?q=naruto');
  const data = await res.json();
  console.log("Results count:", data.results ? data.results.length : data);
  console.log("Debug logs:", data.debugLogs);
}
test();
