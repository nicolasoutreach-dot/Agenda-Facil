import app from './app.js';
import { connectDatabase } from './database/prisma.js';

const PORT = Number(process.env.PORT ?? 3000);

async function start() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Application startup failed:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default start;
