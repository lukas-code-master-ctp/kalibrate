# Kalibrate

App de tracking calórico que modela el cuerpo como un sistema dinámico, adaptativo y ruidoso. No es otra app de calorías: el diferenciador es **cómo modela la fisiología** y **cómo comunica incertidumbre**.

## Principios fundacionales

1. **El cuerpo es un sistema dinámico**, no una ecuación estática. TDEE se calibra, no se asume.
2. **Consistencia > precisión absoluta.** El modelo bayesiano absorbe sesgo consistente.
3. **Comunicar incertidumbre, no falsa precisión.** Toda predicción lleva rango.
4. **Adherencia y resultado son métricas separadas.** Evaluarlas juntas desmotiva injustamente.
5. **Tendencia > observación puntual.** El peso de hoy es ruido; la tendencia suavizada es señal.
6. **Educación integrada en la UX.** Apps que enseñan crean usuarios fieles; las que solo dan números crean usuarios ansiosos.

## Stack

| Capa               | Elección                                             |
| ------------------ | ---------------------------------------------------- |
| App                | Expo (React Native) + TypeScript                     |
| Routing            | Expo Router                                          |
| Estado             | Zustand                                              |
| Visualización      | (TBD: Victory Native XL o react-native-skia)         |
| Backend            | Supabase (Postgres + Auth + RLS + Storage)           |
| Cómputo del modelo | TypeScript puro en `src/core/`, corriendo en cliente |
| Testing            | Vitest para el Model Core                            |
| Notificaciones     | Expo Notifications                                   |

## Estructura

```
src/
├── app/                # Expo Router screens
├── core/               # Model Core, sin dependencias de RN
│   ├── constants.ts
│   └── model/
│       ├── smoothing.ts        # EMA del peso
│       ├── smoothing.test.ts
│       └── types.ts
├── data/               # Repos + cliente Supabase
├── components/         # UI compartida (template Expo)
├── hooks/
└── constants/

supabase/
└── migrations/         # SQL versionado
```

## Setup local

### Prerequisitos

- Node.js 20 LTS o superior
- pnpm 11+
- Cuenta Supabase con proyecto creado
- Expo Go instalado en celular (Android Play Store / iOS App Store)

### Instalación

```powershell
pnpm install
```

### Variables de entorno

Copiar `.env.example` a `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Completar con las credenciales de tu proyecto Supabase (Project Settings → API).

### Aplicar migración de base de datos

Ver [supabase/README.md](supabase/README.md). Por ahora: pegar el contenido de `supabase/migrations/0001_init.sql` en el SQL Editor de tu proyecto Supabase y ejecutar.

### Levantar la app

```powershell
pnpm start
```

Escanear el QR con Expo Go.

## Scripts

| Comando              | Acción                           |
| -------------------- | -------------------------------- |
| `pnpm start`         | Levanta Expo dev server          |
| `pnpm android`       | Abre en Android                  |
| `pnpm ios`           | Abre en iOS                      |
| `pnpm test`          | Corre Vitest sobre el Model Core |
| `pnpm test:watch`    | Vitest en modo watch             |
| `pnpm test:coverage` | Vitest con reporte de coverage   |
| `pnpm typecheck`     | `tsc --noEmit`                   |
| `pnpm lint`          | `expo lint`                      |
| `pnpm format`        | Prettier write                   |
| `pnpm format:check`  | Prettier check (usado en CI)     |

## Roadmap

- **S0** Setup (Expo + Supabase + auth + estructura). ✅
- **S1** Onboarding completo + perfil + objetivos.
- **S2** Tracking de peso + EMA + visualización trend con banda.
- **S3** Food entries: catálogo OFF + búsqueda + saved meals.
- **S4** Model Core: prior + calibración bayesiana del TDEE.
- **S5** Ciclo menstrual + ajuste de fase.
- **S6** Weekly status + banda de no preocupación. **Dogfooding empieza acá.**
- **S7** Insights + alerta RED-S + warnings de déficit agresivo.
- **S8** Notificaciones + check-in semanal.
- **S9** Pulido + e2e con Maestro + MVP listo.

## Privacidad

Datos sensibles (peso, ciclo, sexo, método anticonceptivo) son categoría especial bajo GDPR/LGPD. Toda tabla tiene RLS habilitado; `anon key` es seguro exponer en cliente porque las políticas hacen el cumplimiento.

## Licencia

MIT. Ver [LICENSE](LICENSE).
