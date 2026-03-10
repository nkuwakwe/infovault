// Example Netlify Function
// Move your backend logic here
export async function handler(event, context) {
  // Your backend API logic here
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Netlify Functions!" }),
  };
}
