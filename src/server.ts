import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import fileRoutes from "./routes/fileRoutes";
import folderRouter from "./routes/folderRoutes";
import editRouter from "./routes/edit";
import ShareRouter from "./routes/share";
dotenv.config();


const app = express();
app.use(cors({
	origin: [
		'http://localhost:3000',
		'https://file-manager-backend-grev-dharaneeshp56-gmailcoms-projects.vercel.app',
		'https://file-manager-backend-grev-fthb7h4kz.vercel.app',
		// Add your deployed frontend URL here if needed
	],
	credentials: true
}));
app.use(express.json());
const PORT = process.env.PORT || 5000;


app.use("/api", fileRoutes);
app.use("/api/folder", folderRouter);
app.use("/api/edit", editRouter);
app.use("/api/share", ShareRouter);

export default app;