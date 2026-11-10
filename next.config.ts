import type { NextConfig } from "next";
import { listingImageRemotePatterns, supabaseStorageHostnames } from "./src/lib/listing-images";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
      },
      {
        protocol: "https",
        hostname: "www.microsoft.com",
      },
      ...listingImageRemotePatterns(supabaseStorageHostnames(process.env.NEXT_PUBLIC_SUPABASE_URL)),
    ],
  },
};

export default nextConfig;
