/* Shared PrismaClient instance */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';


const connectionString  = process.env.DATABASE_URL

if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

async function pingPostgres(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export { disconnectPrisma, pingPostgres };
export default prisma;
