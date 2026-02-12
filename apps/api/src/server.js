import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import usersRoutes from "./routes/users.routes.js";
import coursesRoutes from "./routes/courses.routes.js";
import activitiesRoutes from "./routes/activities.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import reflectionRoutes from "./routes/reflection.routes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

// CORS (importante para cookies)
app.use(
  cors({
    origin: env.WEB_ORIGIN, // ej: http://localhost:3000
    credentials: true,
  })
);

// Serve uploaded files
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/users", usersRoutes);
app.use("/courses", coursesRoutes);
app.use("/courses/:courseId/activities", activitiesRoutes);
app.use("/courses/:courseId/attendance", attendanceRoutes);
app.use("/courses/:courseId/reflections", reflectionRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
});
