import express from 'express';
import { AuthController } from './controllers/auth.controller';
import { SessionController } from './controllers/session.controller';
import { AuthMiddleware } from './middleware/auth.middleware';
import { DatabaseConnection } from './database/connection';
import { RedisConnection } from './database/redis';
import { DatabaseSchema } from './database/schema';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const authController = new AuthController();
const sessionController = new SessionController();
const authMiddleware = new AuthMiddleware();

app.post('/api/auth/register', (req, res) => authController.register(req, res));
app.post('/api/auth/login', (req, res) => authController.login(req, res));
app.get('/api/auth/profile/:phoneNumber', (req, res) => authController.getProfile(req, res));
app.put('/api/auth/profile/:phoneNumber', authMiddleware.authenticate, (req, res) => authController.updateProfile(req, res));
app.delete('/api/auth/profile/:phoneNumber', authMiddleware.authenticate, (req, res) => authController.deleteProfile(req, res));

app.get('/api/sessions/:sessionId', authMiddleware.authenticate, (req, res) => sessionController.getSession(req, res));
app.put('/api/sessions/:sessionId/context', authMiddleware.authenticate, (req, res) => sessionController.updateSessionContext(req, res));
app.post('/api/sessions/:sessionId/end', authMiddleware.authenticate, (req, res) => sessionController.endSession(req, res));
app.get('/api/sessions/active/:phoneNumber', authMiddleware.authenticate, (req, res) => sessionController.getActiveSessions(req, res));
app.post('/api/sessions/:sessionId/resume', authMiddleware.authenticate, (req, res) => sessionController.resumeSession(req, res));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

async function startServer() {
  try {
    DatabaseConnection.initialize();
    await RedisConnection.initialize();
    await DatabaseSchema.initializeTables();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await DatabaseConnection.close();
  await RedisConnection.close();
  process.exit(0);
});

startServer();

export default app;
