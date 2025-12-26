/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Externalize pdfjs-dist for server-side to avoid webpack bundling issues
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from bundling pdfjs-dist on server
      config.externals = config.externals || [];
      config.externals.push({
        "pdfjs-dist": "pdfjs-dist",
        "pdfjs-dist/legacy/build/pdf": "pdfjs-dist/legacy/build/pdf",
      });
    }

    // Handle canvas for pdfjs-dist (used by node-canvas on server)
    config.resolve.alias.canvas = false;

    // Alias pdfjs-dist to use legacy build to avoid ESM issues
    config.resolve.alias["pdfjs-dist"] = "pdfjs-dist/legacy/build/pdf";

    return config;
  },
};

export default nextConfig;
