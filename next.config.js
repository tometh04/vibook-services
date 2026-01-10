/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: process.env.NODE_ENV === 'production',
  // Configurar experimental para evitar problemas con Edge Runtime
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Asegurar que el middleware no use módulos problemáticos
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Para cliente, no hacer nada especial
      return config
    }
    // Para servidor, asegurar que los módulos se resuelvan correctamente
    return config
  },
}

module.exports = nextConfig
