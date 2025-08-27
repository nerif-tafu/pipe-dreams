// Simplified version to test if the route is working
export async function GET() {
  console.log('SteamCMD progress endpoint called at:', new Date().toISOString());
  
  const stream = new ReadableStream({
    start(controller) {
      const sendProgress = () => {
        try {
          // Simple test progress data without SteamCMD wrapper dependency
          const data = JSON.stringify({
            progress: 50,
            status: 'SteamCMD progress endpoint is working (simplified)',
            complete: false
          });
          
          controller.enqueue(`data: ${data}\n\n`);
          
          // Send one update and close
          setTimeout(() => {
            const completeData = JSON.stringify({
              progress: 100,
              status: 'Complete',
              complete: true
            });
            controller.enqueue(`data: ${completeData}\n\n`);
            controller.close();
          }, 1000);
          
        } catch (error) {
          console.error('Error in SteamCMD progress endpoint:', error);
          controller.close();
        }
      };
      
      // Start sending progress updates
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
