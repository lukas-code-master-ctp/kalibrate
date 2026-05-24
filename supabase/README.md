# Supabase — Kalibrate

Migraciones SQL del proyecto. Para correrlas en tu instancia:

## Opción A — SQL Editor (más simple para el MVP)

1. Abrí tu proyecto en [app.supabase.com](https://app.supabase.com).
2. Ir a **SQL Editor**.
3. Pegar el contenido de cada archivo `migrations/*.sql` en orden numérico.
4. Ejecutar.

## Opción B — Supabase CLI (recomendado cuando el proyecto crezca)

Si después instalás la CLI:

```powershell
supabase link --project-ref <tu-project-ref>
supabase db push
```

## Convenciones

- Cada migración numerada `NNNN_descripcion.sql`. No editar después de aplicada — siempre crear nueva.
- RLS habilitado en todas las tablas.
- Política base: el usuario solo ve filas con su `user_id`.
- Timestamps en UTC (`timestamptz`).
