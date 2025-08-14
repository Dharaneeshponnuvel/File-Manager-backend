import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import fileRoutes from "./routes/fileRoutes";
import folderRouter from "./routes/folderRoutes";
import editRouter from "./routes/edit";
import ShareRouter from "./routes/share";
dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;

app.use(cors({
	origin: [
		'http://localhost:3000', // local frontend
		'https://file-manager-backend-grev-fthb7h4kz.vercel.app', // deployed backend
		'https://your-frontend-domain.com' // <-- replace with your deployed frontend domain
	],
	credentials: true
}));
app.use(express.json());


app.use("/api", fileRoutes);
app.use("/api/folder", folderRouter);
app.use("/api/edit", editRouter);
app.use("/api/share", ShareRouter);

export default app;