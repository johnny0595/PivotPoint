// Run this in the browser console to test CORS
(async function testCORS() {
  try {
    console.log("Testing CORS with the Flask backend...");
    const response = await fetch('http://localhost:5000/api/test-cors');
    const data = await response.json();
    console.log("CORS test successful:", data);
  } catch (error) {
    console.error("CORS test failed:", error);
  }
})();
