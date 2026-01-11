# 🚀 Vibook Gestión - Sistema de Gestión para Agencias de Viajes (SaaS)

**Vibook Gestión** es un sistema completo de gestión (ERP) diseñado específicamente para agencias de viajes, convertido en un **SaaS multi-tenant** que permite a múltiples agencias gestionar sus operaciones de manera independiente.

## ✨ Características Principales

### Gestión de Operaciones
- ✅ **Operaciones de viaje** con seguimiento completo
- ✅ **Clientes** con historial y segmentación
- ✅ **Operadores** y proveedores
- ✅ **Leads** con integración con Trello
- ✅ **Cotizaciones** y facturación

### Finanzas y Contabilidad
- ✅ **Caja** (ingresos y egresos)
- ✅ **Contabilidad** con libro mayor y plan de cuentas
- ✅ **IVA** (ventas y compras)
- ✅ **Pagos** a operadores y de clientes
- ✅ **Comisiones** de vendedores
- ✅ **Facturación** con AFIP

### Integraciones
- ✅ **Trello** para gestión de leads (Kanban)
- ✅ **Manychat** para CRM y automatización
- ✅ **WhatsApp** para comunicación con clientes
- ✅ **Emilia (IA)** para búsqueda de viajes

### SaaS Multi-Tenant
- ✅ **Signup público** con verificación de email
- ✅ **Social login** (Google OAuth)
- ✅ **Onboarding** guiado para nuevas agencias
- ✅ **Suscripciones** y billing (Mercado Pago)
- ✅ **Branding personalizado** por tenant
- ✅ **Permisos y roles** (SUPER_ADMIN, ADMIN, CONTABLE, SELLER, VIEWER)

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **UI:** shadcn/ui, Tailwind CSS
- **Backend:** Next.js API Routes
- **Base de datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Pagos:** Mercado Pago
- **Deploy:** Vercel
- **Lenguaje:** TypeScript

## 📋 Requisitos Previos

- Node.js 18+ y npm/pnpm/yarn
- Cuenta en Supabase (gratuita)
- Cuenta en Mercado Pago (para pagos, opcional)
- Git

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd maxeva-saas
```

### 2. Instalar Dependencias

```bash
npm install
# o
pnpm install
# o
yarn install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Mercado Pago (Opcional, para billing)
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_aqui

# OpenAI (Opcional, para AI features)
OPENAI_API_KEY=tu_openai_key_aqui

# Emilia/Vibook API (Opcional, para búsqueda de viajes)
EMILIA_API_KEY=wsk_xxx
EMILIA_API_URL=https://api.vibook.ai/search
```

**Nota:** Las credenciales de Supabase las encontrás en tu proyecto: Settings → API

### 4. Ejecutar Migraciones SQL

1. Ve a tu proyecto en Supabase Dashboard
2. Ve a **SQL Editor**
3. Ejecuta las migraciones en orden:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_financial_modules.sql`
   - `supabase/migrations/003_additional_modules.sql`
   - `supabase/migrations/004_billing_system.sql`

### 5. Configurar Autenticación

1. **Configurar Google OAuth** (opcional):
   - Sigue las instrucciones en `GUIA_CONFIGURACION_GOOGLE_OAUTH.md`
   - Agrega las Redirect URLs en Supabase Dashboard

2. **Configurar Redirect URLs en Supabase:**
   - Ve a Authentication → URL Configuration
   - Agrega:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/verify-email`
     - `http://localhost:3000/auth/verified`
     - Tu URL de producción cuando deployes

### 6. Iniciar el Servidor de Desarrollo

```bash
npm run dev
# o
pnpm dev
# o
yarn dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📚 Documentación Adicional

### Guías de Configuración
- [`CONFIGURACION_SUPABASE.md`](./CONFIGURACION_SUPABASE.md) - Configuración inicial de Supabase
- [`GUIA_CONFIGURACION_GOOGLE_OAUTH.md`](./GUIA_CONFIGURACION_GOOGLE_OAUTH.md) - Configurar Google OAuth
- [`CONFIGURACION_MERCADOPAGO.md`](./CONFIGURACION_MERCADOPAGO.md) - Configurar Mercado Pago
- [`CONFIGURACION_VERCEL.md`](./CONFIGURACION_VERCEL.md) - Deploy en Vercel
- [`REDIRECT_URLS_SUPABASE.md`](./REDIRECT_URLS_SUPABASE.md) - URLs de redirect para Supabase
- [`INSTRUCCIONES_SETUP_AUTH.md`](./INSTRUCCIONES_SETUP_AUTH.md) - Setup completo de autenticación

### Roadmap y Estado del Proyecto
- [`ROADMAP_SAAS.md`](./ROADMAP_SAAS.md) - Roadmap completo de conversión a SaaS
- [`CLAUDE.md`](./CLAUDE.md) - Documentación técnica del proyecto

## 🏗️ Estructura del Proyecto

```
maxeva-saas/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación (públicas)
│   ├── (dashboard)/       # Rutas del dashboard (protegidas)
│   ├── api/               # API Routes
│   └── onboarding/        # Flujo de onboarding
├── components/            # Componentes React
│   ├── ui/               # Componentes shadcn/ui
│   ├── dashboard/        # Componentes del dashboard
│   ├── sales/            # Componentes de ventas
│   ├── customers/        # Componentes de clientes
│   └── ...
├── lib/                   # Utilidades y helpers
│   ├── supabase/         # Clientes de Supabase
│   ├── billing/          # Lógica de billing
│   ├── mercadopago/      # Cliente de Mercado Pago
│   └── ...
├── hooks/                 # React Hooks personalizados
├── supabase/
│   └── migrations/       # Migraciones SQL
└── public/               # Archivos estáticos
```

## 🔐 Roles y Permisos

El sistema incluye los siguientes roles:

- **SUPER_ADMIN:** Acceso completo a su agencia, puede gestionar usuarios y configuración
- **ADMIN:** Acceso completo excepto configuración crítica
- **CONTABLE:** Acceso a módulos financieros y contables
- **SELLER:** Acceso a ventas, leads y clientes
- **VIEWER:** Solo lectura

## 🌐 Deploy

### Deploy en Vercel

1. Conectá tu repositorio a Vercel
2. Agrega las variables de entorno en Vercel Dashboard
3. Configura las Redirect URLs en Supabase para tu dominio de producción
4. Deploy automático en cada push a `main`

Ver [`CONFIGURACION_VERCEL.md`](./CONFIGURACION_VERCEL.md) para más detalles.

## 🤝 Contribuir

Este es un proyecto privado. Para contribuciones o preguntas, contactá al equipo de desarrollo.

## 📝 Licencia

Propietario - Todos los derechos reservados

## 🆘 Soporte

Para problemas o preguntas:
1. Revisá la documentación en `/docs`
2. Verificá las guías de configuración
3. Revisá los logs en Vercel Dashboard (si está deployado)

---

**Desarrollado con ❤️ para agencias de viajes**
