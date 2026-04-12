async function test() {
  const res = await fetch('http://localhost:3000/api/search-duckduckgo?q=naruto');
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    console.log(JSON.stringify(data.results[0], null, 2));
    console.log(JSON.stringify(data.results[1], null, 2));
  }
}
test();
