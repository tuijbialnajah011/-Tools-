async function test() {
  const res = await fetch('http://localhost:3000/api/image-proxy?url=https%3A%2F%2Fwallpapers.com%2Fimages%2Fhd%2F4k-ultra-hd-naruto-summoning-animals-knxgukcfu4gm9k62.jpg&download=1&filename=test.jpg');
  console.log("Status:", res.status);
  console.log("Content-Type:", res.headers.get('content-type'));
  console.log("Content-Disposition:", res.headers.get('content-disposition'));
  const text = await res.text();
  console.log("Body preview:", text.substring(0, 100));
}
test();
