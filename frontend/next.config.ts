import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Raster images (final hero illustrations, portfolio screenshots) are
  // served as AVIF where supported, WebP otherwise.
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
