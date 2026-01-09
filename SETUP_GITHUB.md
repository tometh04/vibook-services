# 🚀 Setup de GitHub - Vibook Gestión SaaS

## ✅ Lo que ya está hecho:

1. ✅ **Migraciones consolidadas creadas**: 3 archivos SQL limpios
2. ✅ **Migraciones antiguas eliminadas**: Todo limpio
3. ✅ **Archivo .env.example creado**: Template de variables de entorno
4. ✅ **.gitignore verificado**: Configurado correctamente

## 📋 Pasos para hacer commits en GitHub:

### **PASO 1: Configurar Git (si no lo tienes configurado)**

```bash
# Configurar tu nombre y email (solo la primera vez)
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### **PASO 2: Inicializar el repositorio Git**

```bash
cd "/Users/tomiisanchezz/Desktop/Vibook Services/maxeva-saas"

# Inicializar git
git init

# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit: Vibook Gestión SaaS - Migraciones consolidadas"
```

### **PASO 3: Conectar con GitHub**

#### **Opción A: Usando HTTPS (requiere token personal)**

1. Crear un nuevo repositorio en GitHub:
   - Ir a https://github.com/new
   - Nombre: `vibook-gestion` (o el que prefieras)
   - **NO** inicializar con README
   - Click "Create repository"

2. Generar un Personal Access Token (PAT):
   - Ir a https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Nombre: `vibook-gestion-access`
   - Expiración: `No expiration` (o la que prefieras)
   - Scopes: Marcar `repo` (full control)
   - Click "Generate token"
   - **⚠️ IMPORTANTE: Copiar el token inmediatamente, no se muestra de nuevo**

3. Conectar el repo local con GitHub:

```bash
# Agregar el remote (reemplazar TU_USUARIO con tu username de GitHub)
git remote add origin https://TU_USUARIO:TU_TOKEN@github.com/TU_USUARIO/vibook-gestion.git

# O usar el token en la URL cuando te pida la contraseña
git remote add origin https://github.com/TU_USUARIO/vibook-gestion.git

# Push al repositorio
git branch -M main
git push -u origin main
```

#### **Opción B: Usando SSH (recomendado para producción)**

1. Generar una SSH key (si no tienes una):

```bash
# Generar SSH key
ssh-keygen -t ed25519 -C "tu@email.com"

# Presionar Enter para usar la ubicación por defecto
# Crear una contraseña o dejarla vacía

# Copiar la clave pública
cat ~/.ssh/id_ed25519.pub
```

2. Agregar la SSH key a GitHub:
   - Ir a https://github.com/settings/keys
   - Click "New SSH key"
   - Título: `Vibook Gestión - Mac`
   - Key: Pegar el contenido de `~/.ssh/id_ed25519.pub`
   - Click "Add SSH key"

3. Conectar el repo:

```bash
# Agregar el remote con SSH
git remote add origin git@github.com:TU_USUARIO/vibook-gestion.git

# Push al repositorio
git branch -M main
git push -u origin main
```

### **PASO 4: Verificar que todo funcionó**

```bash
# Ver los remotes configurados
git remote -v

# Ver el estado
git status

# Ver los commits
git log --oneline
```

## 🔐 **Autenticación en GitHub**

### **Método 1: Personal Access Token (PAT)**
- ✅ Más fácil de configurar
- ✅ Funciona con HTTPS
- ⚠️ Debes guardar el token en un lugar seguro
- ⚠️ Si usas HTTPS, GitHub pedirá el token como contraseña

### **Método 2: SSH Keys**
- ✅ Más seguro
- ✅ No necesitas ingresar credenciales cada vez
- ⚠️ Requiere configuración inicial

### **Método 3: GitHub CLI (`gh`)**
```bash
# Instalar GitHub CLI (si no lo tienes)
brew install gh

# Autenticarse
gh auth login

# Luego puedes usar comandos como:
gh repo create vibook-gestion --public
```

## 📝 **Comandos útiles para el día a día:**

```bash
# Ver estado
git status

# Agregar cambios
git add .
git add archivo-especifico.ts

# Hacer commit
git commit -m "Descripción del cambio"

# Push
git push

# Pull (traer cambios del remoto)
git pull

# Ver historial
git log --oneline --graph

# Crear una nueva rama
git checkout -b nombre-rama

# Cambiar de rama
git checkout main
```

## 🚨 **Solución de problemas comunes:**

### **Error: "fatal: remote origin already exists"**
```bash
# Ver el remote actual
git remote -v

# Eliminar el remote actual
git remote remove origin

# Agregar el nuevo remote
git remote add origin URL_DEL_NUEVO_REPO
```

### **Error: "Permission denied"**
- Verificar que tu SSH key está agregada a GitHub
- O usar Personal Access Token con HTTPS

### **Error: "Authentication failed"**
- Si usas HTTPS, asegúrate de usar el token como contraseña (no tu password de GitHub)
- Si usas SSH, verificar que la key está agregada: `ssh -T git@github.com`

## ✅ **Checklist antes de hacer push:**

- [ ] Archivos sensibles no están en el commit (`.env.local`, `.env`)
- [ ] `.gitignore` está configurado correctamente
- [ ] Variables de entorno solo están en `.env.example`
- [ ] No hay credenciales hardcodeadas en el código
- [ ] Las migraciones están listas para ejecutarse en Supabase

## 📚 **Recursos útiles:**

- [GitHub Docs - Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub Docs - SSH Keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Git Documentation](https://git-scm.com/doc)

---

**¿Necesitas ayuda?** Si tienes algún problema, comparte el error que estás viendo y te ayudo a solucionarlo.
