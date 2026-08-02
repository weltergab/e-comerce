import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });

// Conveniencia local: durante a separacao do projeto, permite rodar o backend
// usando temporariamente o .env.local do frontend, sem afetar as envs da Vercel.
dotenv.config({ path: '../frontend_ecomerce/.env.local', quiet: true });
dotenv.config({ path: '../.env.local', quiet: true });
