import express from "express";
import protectedRoutes from "./protected.routes";

const router = express.Router();

router.use("/", protectedRoutes);

export default router;
