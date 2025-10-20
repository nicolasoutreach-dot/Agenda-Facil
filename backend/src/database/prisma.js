import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    if (process.env.NODE_ENV !== 'test') {
      console.log('Database connection established');
    }
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export default prisma;
