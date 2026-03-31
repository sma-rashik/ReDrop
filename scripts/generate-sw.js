import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const templatePath = path.resolve(__dirname, '../public/firebase-messaging-sw.js.template');
const outputPath = path.resolve(__dirname, '../public/firebase-messaging-sw.js');

if (!fs.existsSync(templatePath)) {
  console.error('Template file not found at:', templatePath);
  process.exit(1);
}

let template = fs.readFileSync(templatePath, 'utf8');

const placeholders = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

placeholders.forEach(key => {
  const value = process.env[key] || '';
  if (!value) {
    console.warn(`Warning: Environment variable ${key} is missing.`);
  }
  template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
});

fs.writeFileSync(outputPath, template);
console.log('Successfully generated public/firebase-messaging-sw.js');
