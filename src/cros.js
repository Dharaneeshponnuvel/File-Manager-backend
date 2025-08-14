import cors from 'cors';
const allowedOrigins = [
  'http://localhost:3000',
  'https://file-manager-backend-grev-dharaneeshp56-gmailcoms-projects.vercel.app' // replace with actual deployed frontend
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));