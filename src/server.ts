import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import fileRoutes from "./routes/fileRoutes";
import folderRouter from "./routes/folderRoutes";
import editRouter from "./routes/edit";
import ShareRouter from "./routes/share";
dotenv.config();
const port = process.env.PORT || 5000;
const app = express();
app.use(cors({
	origin: (origin, callback) => callback(null, true),
	credentials: true
}));
app.use(express.json());



app.use("/api", fileRoutes);
app.use("/api/folder", folderRouter);
app.use("/api/edit", editRouter);
app.use("/api/share", ShareRouter);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})