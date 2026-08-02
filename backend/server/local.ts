import { startServer } from './index';

try {
  startServer();
} catch (error) {
  console.error('Failed to start API server:', error);
  process.exit(1);
}
