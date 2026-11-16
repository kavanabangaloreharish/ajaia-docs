/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native/wasm DB drivers must not be bundled by webpack.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "mammoth"],
};
export default nextConfig;
