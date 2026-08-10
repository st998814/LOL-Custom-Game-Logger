import dotenv from 'dotenv';
dotenv.config({path:"../.env"});
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    // Use direct connection for migrations (pooler doesn't support advisory locks)
    url: env("DIRECT_URL"),
  },
});
