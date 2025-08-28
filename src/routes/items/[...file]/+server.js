import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET({ params }) {
  try {
    const filePath = join(process.cwd(), 'static', 'items', params.file);
    
    if (!existsSync(filePath)) {
      return new Response('File not found', { status: 404 });
    }
    
    const fileBuffer = readFileSync(filePath);
    const contentType = getContentType(params.file);
    
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      }
    });
  } catch (error) {
    console.error('Error serving static file:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}
