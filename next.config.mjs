/** @type {import('next').NextConfig} */
const nextConfig = {
  // 배포 시 타입스크립트 에러 무시
  typescript: {
    ignoreBuildErrors: true,
  },
  // recharts 3.x ESM 순환 참조 이슈 해결
  transpilePackages: ['recharts'],
};

export default nextConfig;