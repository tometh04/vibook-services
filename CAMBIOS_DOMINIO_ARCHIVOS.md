# 📝 Archivos a Actualizar para Cambio de Dominio

## 🔍 Archivos que Contienen el Dominio Actual

Estos archivos contienen referencias a `vibookservicessaas.vercel.app` y deben actualizarse a `app.vibook.ai`:

### Documentación (Archivos .md)

Los siguientes archivos de documentación deben actualizarse con el nuevo dominio:

1. **REDIRECT_URLS_SUPABASE.md** - Actualizar todas las URLs
2. **CONFIGURACION_MERCADOPAGO_VERCEL.md** - Actualizar URLs de ejemplo
3. **CONFIGURACION_URLS_REDIRECCION.md** - Actualizar URLs de redirección
4. **SOLUCION_IPN_405.md** - Actualizar URLs de ejemplo
5. **SOLUCION_ERRORES_CHECKOUT.md** - Actualizar URLs de ejemplo
6. **SOLUCION_403_CAMPOS_TARJETA.md** - Actualizar URLs de ejemplo
7. **DIAGNOSTICO_403_CONFIRMADO.md** - Actualizar URLs de ejemplo
8. **CONFIGURACION_PRODUCCION.md** - Actualizar URLs de ejemplo
9. **MIGRAR_IPN_A_WEBHOOKS.md** - Actualizar URLs de ejemplo
10. **GUIA_COMPLETA_MERCADOPAGO.md** - Actualizar URLs de ejemplo
11. **CONFIGURACION_MERCADOPAGO.md** - Actualizar URLs de ejemplo
12. **DEBUG_MERCADOPAGO.md** - Actualizar URLs de ejemplo
13. **INSTRUCCIONES_SETUP_AUTH.md** - Actualizar URLs de ejemplo
14. **SOLUCION_ERROR_OAUTH_404.md** - Actualizar URLs de ejemplo

**Nota:** Estos archivos son solo documentación. Los cambios importantes están en las configuraciones (Vercel, Supabase, Mercado Pago).

---

## 🔄 Reemplazo Masivo (Opcional)

Si quieres actualizar todos los archivos de documentación de una vez:

```bash
# Desde el directorio del proyecto
find . -name "*.md" -type f -exec sed -i '' 's/vibookservicessaas\.vercel\.app/app.vibook.ai/g' {} \;
```

**⚠️ CUIDADO:** Esto reemplazará TODAS las ocurrencias. Revisa los cambios antes de commitear.

---

## ✅ Archivos que NO Necesitan Cambios

Los siguientes archivos usan variables de entorno, así que NO necesitan cambios:

- `app/api/billing/checkout/route.ts` - Usa `process.env.NEXT_PUBLIC_APP_URL`
- `app/api/billing/webhook/route.ts` - No tiene URLs hardcodeadas
- `lib/supabase/client.ts` - Usa variables de entorno
- Cualquier archivo que use `process.env.NEXT_PUBLIC_APP_URL`

---

## 📋 Checklist de Actualización de Documentación

- [ ] Actualizar REDIRECT_URLS_SUPABASE.md
- [ ] Actualizar CONFIGURACION_MERCADOPAGO_VERCEL.md
- [ ] Actualizar CONFIGURACION_URLS_REDIRECCION.md
- [ ] Actualizar otros archivos .md con ejemplos
- [ ] Revisar cambios antes de commitear
- [ ] Commit y push de los cambios

---

**Nota:** Los cambios más importantes NO están en el código, sino en las configuraciones externas (Vercel, Supabase, Mercado Pago). La documentación es solo para referencia.

---

**Última actualización:** 2026-01-11
