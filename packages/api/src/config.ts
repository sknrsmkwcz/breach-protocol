import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Admin
  ADMIN_SETUP_KEY: z.string().optional(),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  
  return result.data;
}

export const config = loadConfig();

export const isDev = config.NODE_ENV === 'development';
export const isProd = config.NODE_ENV === 'production';
