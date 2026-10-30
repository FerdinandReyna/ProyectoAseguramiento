import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// Módulos críticos definidos en el entregable E2 (fase 1).
// La cobertura se mide solo sobre ellos para comparar contra la línea base.
const criticalModules = [
  "backend/controllers/users.js",
  "backend/controllers/user.js",
  "backend/controllers/articles.js",
  "backend/controllers/comments.js",
  "backend/controllers/favorites.js",
  "backend/controllers/profiles.js",
  "backend/middleware/*.js",
  "backend/helper/*.js",
  "frontend/src/services/*.js",
  "frontend/src/helpers/errorHandler.js",
  "frontend/src/components/FavButton/FavButton.jsx",
  "frontend/src/components/FollowButton/FollowButton.jsx",
];

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    reporters: ["default", "junit"],
    outputFile: { junit: "reports/junit.xml" },
    coverage: {
      provider: "v8",
      include: criticalModules,
      exclude: ["**/*.test.*"],
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "backend",
          environment: "node",
          include: ["backend/**/*.test.js"],
          setupFiles: ["backend/tests/setup.js"],
        },
      },
      {
        extends: true,
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["frontend/src/**/*.test.{js,jsx}"],
          setupFiles: ["frontend/src/setupTests.js"],
          css: true,
        },
      },
    ],
  },
});
