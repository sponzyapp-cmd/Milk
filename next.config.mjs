/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // React Compiler disabled (babel-plugin-react-compiler not installed)
  // reactCompiler: true,
  // Optimize for production
  compress: true,
  // Static generation for pages
  staticPageGenerationTimeout: 1000,
  // Trailing slashes disabled
  trailingSlash: false,
  // Compression for better performance
  productionBrowserSourceMaps: false,
}

export default nextConfig
