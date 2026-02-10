/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['three', 'gsap', '@gsap/react', '@react-three/fiber', '@react-three/drei'],
};

module.exports = nextConfig;
