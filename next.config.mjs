/** @type {import('next').NextConfig} */
const nextConfig = {
  // Every page is prebuilt at build time and served as a plain file by Cloudflare.
  output: 'export',
  images: { unoptimized: true },
  // The site renders about 18,000 pages that read the same Supabase tables.
  // Fewer parallel workers keeps the build from flooding Supabase.
  experimental: { cpus: 4 }
};

export default nextConfig;
