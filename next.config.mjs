/** @type {import('next').NextConfig} */
const nextConfig = {
  // Every page is prebuilt at build time and served as a plain file by Cloudflare.
  output: 'export',
  images: { unoptimized: true },
  // Next.js writes the build ID into every page. A fixed ID keeps unchanged pages
  // byte-identical between builds, so a deploy uploads only pages whose content
  // changed. Safe here: Cloudflare revalidates every asset on each request.
  generateBuildId: async () => 'ryfoya',
  // The site renders about 24,000 pages that read the same Supabase tables.
  // Fewer parallel workers keeps the build from flooding Supabase.
  experimental: { cpus: 4 }
};

export default nextConfig;
