// Expo Router stub - File uploads handled by backend http://localhost:8000/api/upload (multer + vercel/blob)
// Prevents Metro bundler failure from Next.js imports
export function POST() {
  return new Response('Upload via backend API', { status: 501 });
}

// DELETE handled by backend
export function DELETE() {
  return new Response('Handled by backend', { status: 501 });
}

