/** @type {import('next').NextConfig} */
const nextConfig = {
  // 배포 시 타입스크립트 에러 무시
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;