import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export const initWebSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // in production, configure this appropriately
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room for a specific assignment ID
    socket.on('join_assignment', (assignmentId: string) => {
      socket.join(assignmentId);
      console.log(`👤 Client ${socket.id} joined room: ${assignmentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const sendProgressUpdate = (
  assignmentId: string,
  progress: number,
  statusMessage: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' = 'processing'
) => {
  if (!io) {
    console.warn('⚠️ Socket.io is not initialized. Skipping progress broadcast.');
    return;
  }

  console.log(`📢 Broadcasting: ${assignmentId} [${progress}%] - ${statusMessage} (${status})`);
  io.to(assignmentId).emit('progress_update', {
    assignmentId,
    progress,
    statusMessage,
    status,
  });
};
