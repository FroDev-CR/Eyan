# EYAN - Contexto de Desarrollo

> Este documento contiene todo el contexto necesario para continuar el desarrollo del proyecto EYAN en futuras sesiones.

---

## 1. ¿Qué es EYAN?

**EYAN** es una plataforma web de gestión de transporte para una empresa transportista que actualmente opera 100% en papel. El objetivo es digitalizar todas sus operaciones de forma incremental, departamento por departamento.

### Visión del producto (fases futuras):
- CRM (clientes, cotizaciones, contratos)
- Recursos Humanos (empleados, documentos, evaluaciones)
- Órdenes de transporte
- Gestión de planilla y nómina
- Gestión de flota (camiones, mantenimiento)
- Rutas y logística

### Fase actual: Planificación de rutas y asignaciones (estilo Jobber)
Esta es la **Fase 1** del proyecto, enfocada en el módulo de planificación que permite asignar choferes, camiones y rutas de manera visual.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui (custom) + Radix UI |
| **Estado** | React hooks + fetch (sin Redux) |
| **Backend/API** | Next.js API Routes (Route Handlers) |
| **Base de datos** | MongoDB con Mongoose ODM |
| **Autenticación** | NextAuth.js (credenciales + roles) |
| **Validación** | Zod |
| **Fechas** | date-fns |
| **Drag & Drop** | @dnd-kit (instalado, pendiente implementar) |

---

## 3. Estructura del Proyecto

```
eyan/
├── docs/                         # Documentación
│   └── CONTEXTO-DESARROLLO.md    # Este archivo
├── public/                       # Assets estáticos
├── src/
│   ├── app/                      # App Router de Next.js
│   │   ├── (auth)/               # Rutas de autenticación
│   │   │   └── login/
│   │   ├── (dashboard)/          # Rutas protegidas (requieren auth)
│   │   │   ├── dashboard/        # Vista principal
│   │   │   ├── planning/         # Tablero de planificación
│   │   │   ├── drivers/          # CRUD choferes
│   │   │   ├── fleet/            # CRUD camiones
│   │   │   ├── routes/           # CRUD rutas
│   │   │   └── settings/         # Configuración
│   │   └── api/                  # API Routes
│   │       ├── auth/[...nextauth]/
│   │       ├── drivers/
│   │       ├── fleet/
│   │       ├── routes/
│   │       ├── assignments/
│   │       └── seed/             # Endpoint para datos de prueba
│   │
│   ├── components/
│   │   ├── ui/                   # Componentes base (button, input, card, etc.)
│   │   ├── layout/               # Sidebar, Topbar
│   │   ├── planning/             # PlanningBoard, AssignmentCard, AssignmentModal
│   │   ├── drivers/              # DriverCard, DriverForm
│   │   ├── fleet/                # TruckCard, TruckForm
│   │   ├── routes/               # RouteCard, RouteForm
│   │   └── shared/               # PageHeader, EmptyState, LoadingSpinner, etc.
│   │
│   ├── lib/                      # Utilidades
│   │   ├── db.ts                 # Conexión MongoDB (singleton)
│   │   ├── auth.ts               # Configuración NextAuth
│   │   ├── utils.ts              # Helpers (cn, formatDate, etc.)
│   │   └── validations.ts        # Schemas Zod
│   │
│   ├── models/                   # Modelos Mongoose
│   │   ├── User.ts
│   │   ├── Driver.ts
│   │   ├── Truck.ts
│   │   ├── Route.ts
│   │   ├── Assignment.ts
│   │   └── index.ts
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useDrivers.ts
│   │   ├── useTrucks.ts
│   │   ├── useRoutes.ts
│   │   ├── useAssignments.ts
│   │   └── useToast.ts
│   │
│   ├── types/                    # TypeScript types
│   │   ├── index.ts              # Types principales
│   │   └── api.ts                # Types para API responses
│   │
│   ├── constants/                # Constantes
│   │   ├── navigation.ts         # Items del sidebar
│   │   ├── status.ts             # Estados con labels
│   │   └── roles.ts              # Roles y permisos
│   │
│   ├── providers/                # Context providers
│   │   ├── AuthProvider.tsx
│   │   └── ThemeProvider.tsx
│   │
│   └── middleware.ts             # Protección de rutas
│
├── .env.local                    # Variables de entorno (NO commitear)
├── .env.example                  # Template de variables
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Modelos de Datos

### User
```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  password: string,              // bcrypt hash
  role: 'admin' | 'dispatcher' | 'driver',
  driverId?: ObjectId,           // Vinculación con Driver si es chofer
  isActive: boolean,
  createdAt, updatedAt
}
```

### Driver (Chofer)
```typescript
{
  _id: ObjectId,
  firstName: string,
  lastName: string,
  phone: string,
  email: string,
  licenseNumber: string,
  licenseExpiry: Date,
  status: 'available' | 'on_route' | 'off_duty' | 'inactive',
  avatar?: string,
  userId?: ObjectId,
  createdAt, updatedAt
}
```

### Truck (Camión)
```typescript
{
  _id: ObjectId,
  plateNumber: string,
  name: string,                  // Identificador interno
  brand: string,
  model: string,
  year: number,
  capacity: string,
  type: 'flatbed' | 'refrigerated' | 'cargo' | 'tanker' | 'other',
  status: 'available' | 'in_use' | 'maintenance' | 'inactive',
  currentMileage?: number,
  lastMaintenanceDate?: Date,
  notes?: string,
  createdAt, updatedAt
}
```

### Route (Ruta)
```typescript
{
  _id: ObjectId,
  name: string,                  // ej: "San José → Limón"
  origin: string,
  destination: string,
  estimatedDuration: number,     // minutos
  distance?: number,             // km
  description?: string,
  isActive: boolean,
  createdAt, updatedAt
}
```

### Assignment (Asignación)
```typescript
{
  _id: ObjectId,
  date: Date,
  startTime?: string,            // "HH:MM"
  endTime?: string,
  driverId: ObjectId,            // ref Driver
  truckId: ObjectId,             // ref Truck
  routeId: ObjectId,             // ref Route
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
  notes?: string,
  orderId?: ObjectId,            // (Futuro)
  createdBy: ObjectId,           // ref User
  createdAt, updatedAt
}
```

---

## 5. Roles y Permisos

| Acción | Admin | Dispatcher | Driver |
|--------|-------|------------|--------|
| Ver tablero de planificación | ✅ | ✅ | ❌ |
| Crear/editar asignaciones | ✅ | ✅ | ❌ |
| CRUD choferes | ✅ | ❌ | ❌ |
| CRUD camiones | ✅ | ❌ | ❌ |
| CRUD rutas | ✅ | ✅ | ❌ |
| Ver mi agenda (chofer) | ✅ | ✅ | ✅ |
| Actualizar estado de asignación propia | ✅ | ✅ | ✅ |
| Configuración | ✅ | ❌ | ❌ |

---

## 6. Lo que está COMPLETADO

### Infraestructura
- [x] Proyecto Next.js 14 con TypeScript
- [x] Tailwind CSS con tema oscuro personalizado
- [x] Componentes UI estilo shadcn/ui
- [x] Conexión a MongoDB con Mongoose
- [x] Autenticación con NextAuth.js
- [x] Middleware de protección de rutas por rol
- [x] Sistema de validación con Zod

### Layout
- [x] Sidebar colapsable con navegación por rol
- [x] Topbar con info de usuario y logout
- [x] Layout responsive

### Módulos CRUD
- [x] **Choferes**: Lista, crear, editar, eliminar con filtros
- [x] **Flota (Camiones)**: Lista, crear, editar, eliminar con filtros
- [x] **Rutas**: Lista, crear, editar, eliminar con filtros

### Módulo de Planificación
- [x] Tablero semanal/diario con choferes en filas y días en columnas
- [x] Modal para crear/editar asignaciones
- [x] Tarjetas de asignación con estados
- [x] Cambio de estado (scheduled → in_progress → completed)
- [x] Navegación entre semanas
- [x] Vista de agenda para chofer (DriverAgenda)

### Utilidades
- [x] Endpoint `/api/seed` para poblar datos de prueba
- [x] Página de settings con botón de seed
- [x] Sistema de toasts para notificaciones
- [x] Componentes compartidos (EmptyState, LoadingSpinner, ConfirmDialog, etc.)

---

## 7. Lo que FALTA por hacer

### Mejoras al módulo de planificación
- [ ] **Drag & Drop** con @dnd-kit para mover asignaciones entre choferes/días
- [ ] Panel lateral de rutas/órdenes sin asignar (para arrastrar al tablero)
- [ ] Detección visual de conflictos (chofer o camión ya asignado)
- [ ] Vista de detalle de asignación (`/planning/[id]`)

### Funcionalidades pendientes
- [ ] Vincular usuarios tipo "driver" con su perfil de Driver
- [ ] Dashboard con estadísticas reales (actualmente son datos estáticos)
- [ ] Filtros en el tablero de planificación (por estado, camión, ruta)
- [ ] Búsqueda global
- [ ] Exportar datos a PDF/Excel

### Mejoras de UX
- [ ] Navegación móvil (bottom nav)
- [ ] Optimistic updates en mutaciones
- [ ] Skeleton loaders más detallados
- [ ] Breadcrumbs

### Módulos futuros (Fase 2+)
- [ ] Órdenes de transporte
- [ ] CRM (clientes)
- [ ] Recursos Humanos
- [ ] Planilla/Nómina
- [ ] Mantenimiento de flota

---

## 8. Cómo ejecutar el proyecto

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Edita `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/eyan
NEXTAUTH_SECRET=tu-secret-key-aqui
NEXTAUTH_URL=http://localhost:3000
```

### 3. Iniciar MongoDB
Asegúrate de tener MongoDB corriendo localmente o usa MongoDB Atlas.

### 4. Iniciar el servidor de desarrollo
```bash
npm run dev
```

### 5. Poblar datos de prueba
1. Ve a `http://localhost:3000/settings`
2. Haz clic en "Poblar datos de prueba"

### 6. Iniciar sesión
- **Email**: `admin@eyan.com`
- **Password**: `admin123`

---

## 9. Paleta de Colores

```css
/* Tema oscuro EYAN */
--background: #0F1117;      /* Fondo principal */
--surface: #1A1D27;         /* Cards, sidebar */
--border: #2A2D3A;          /* Bordes */
--primary: #3B82F6;         /* Azul - CTAs, acentos */
--success: #22C55E;         /* Verde - completado */
--warning: #F59E0B;         /* Amarillo - en progreso */
--destructive: #EF4444;     /* Rojo - errores, eliminar */
--muted-foreground: #94A3B8; /* Texto secundario */
```

---

## 10. Convenciones de código

- **Componentes**: PascalCase (`DriverCard.tsx`)
- **Hooks/utils**: camelCase (`useDrivers.ts`)
- **API responses**: `{ success: boolean, data?: T, error?: string }`
- **Validación**: Zod schemas en `lib/validations.ts`
- **Comentarios**: En español para lógica de negocio
- **Estados**: Usar constantes de `constants/status.ts`

---

## 11. Archivos clave para entender el código

1. **`src/lib/auth.ts`** - Configuración de NextAuth con tipos extendidos
2. **`src/middleware.ts`** - Protección de rutas por rol
3. **`src/components/planning/PlanningBoard.tsx`** - Tablero principal
4. **`src/hooks/useAssignments.ts`** - Lógica de asignaciones
5. **`src/constants/navigation.ts`** - Estructura del sidebar
6. **`src/types/index.ts`** - Todos los tipos TypeScript

---

## 12. Notas importantes

1. **MongoDB**: El proyecto usa el patrón singleton en `lib/db.ts` para evitar múltiples conexiones en desarrollo.

2. **Autenticación**: Los tipos de NextAuth están extendidos en `lib/auth.ts` para incluir `role` y `driverId`.

3. **Tailwind v4**: Se instaló Tailwind v4 que tiene algunos cambios en la API. El archivo `tailwind.config.ts` está configurado correctamente.

4. **Zod v4**: Se instaló Zod v4 que cambió `.errors` por `.issues`. Ya está corregido en `validateData()`.

5. **API Pattern**: Todas las APIs siguen el patrón:
   - `GET /api/[resource]` - Lista con filtros via query params
   - `POST /api/[resource]` - Crear
   - `GET /api/[resource]/[id]` - Obtener uno
   - `PUT /api/[resource]/[id]` - Actualizar
   - `DELETE /api/[resource]/[id]` - Eliminar

---

## 13. Para la próxima sesión

Sugerencias de tareas para continuar:

1. **Implementar Drag & Drop** en el PlanningBoard usando @dnd-kit
2. **Crear el panel lateral** de rutas sin asignar
3. **Detectar conflictos** de horario al crear asignaciones
4. **Vincular usuarios driver** con perfiles de chofer
5. **Dashboard con datos reales** en vez de estáticos

---

*Última actualización: Sesión de desarrollo inicial - Proyecto creado desde cero*
