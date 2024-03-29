import fs from 'fs';

export function getConfigValue(key: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    try {
      return fs.readFileSync(`/run/secrets/${key}`, 'utf8').trim();
    } catch (err) {
      console.warn(`Warning: Could not read the secret "${key}". Falling back to environment variable.`);
      return process.env[key] || '';
    }
  }
  return process.env[key] || '';
}
