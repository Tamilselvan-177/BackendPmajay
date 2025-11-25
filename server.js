import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import logger from './middleware/logger.js';
import villageRoutes from "./routes/villageRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import path from "path";
import WorkPackage from './routes/workPackageRoutes.js';

dotenv.config();

const app = express();

// Connect DB
connectDB();

// ************ ENABLE CORS FIRST ************
app.use(cors({ origin: true, credentials: true }));
app.options("*", cors());
// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use(logger);

// ************ ROUTES ************
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/projects', projectRoutes);
app.use("/api/villages", villageRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/project-requests", projectRoutes);
app.use("/api/work-packages", WorkPackage);

// Static files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get('/', (req, res) => {
  res.json({ message: "Server running" });
});

const PORT = process.env.PORT || 5000;
// use for web run 127.0.0.1
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
// use app below think
// app.listen(5000, "0.0.0.0", () => {
//   console.log("Server running on 0.0.0.0:5000");
// });