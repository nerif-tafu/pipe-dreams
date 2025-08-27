import { steamCmdManager } from '$lib/steamcmd-manager.js';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const sendProgress = () => {
        try {
          const progress = steamCmdManager.getDownloadProgress();

          if (progress) {
            const data = JSON.stringify({
              progress: progress.progress || 0,
              status: progress.status || 'Downloading...',
              complete: progress.complete || false
            });

            controller.enqueue(`data: ${data}\n\n`);

            if (progress.complete) {
              controller.close();
              return;
            }
          }

          setTimeout(sendProgress, 1000);
        } catch (error) {
          console.error('Error in progress stream:', error);
          controller.close();
        }
      };

      sendProgress();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
