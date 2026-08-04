import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Evita que Turbopack use D:\colombia (lockfile padre) como workspace root
    // y falle al resolver paquetes de ruralia-frontend/node_modules (p. ej. sweetalert2).
    root: path.join(__dirname),
  },
};

export default nextConfig;
