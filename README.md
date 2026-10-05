# Sistema de Reservas Ecoturísticas - Urabá y Chocó Biogeográfico

Este repositorio contiene el código fuente y la configuración del sistema web diseñado para la gestión de reservas de senderos ecológicos y turismo sostenible en la región de Urabá y el Chocó Biogeográfico.

Este proyecto aplica estrategias integrales de **Gestión de Configuración de Software (GCS)** para garantizar la trazabilidad, calidad e integridad del producto ante nuevos requerimientos normativos (ej. control de aforo por CORPOURABA).

---

## Catálogo de Elementos de Configuración de Software (ECS / EGC)

A continuación se catalogan los elementos del sistema que están bajo control de configuración, de acuerdo con el Plan de Gestión de Configuración del proyecto:

### 1. Programas (Fuentes y Ejecutables)
*   **Frontend (Vistas y Componentes):** Código fuente desarrollado en React + TypeScript (archivos `.tsx`, `App.tsx`, `bookings.ts`, vistas de usuario y administrador).
*   **Backend (Módulos y APIs):** Servicios y controladores REST (ej. módulo de disponibilidad, módulo de autenticación de Supabase, validación de reservas).
*   **Scripts de Construcción y Despliegue:** Archivos de configuración del entorno como `vite.config.ts`, `package.json` y dependencias (`pnpm-lock.yaml`).

### 2. Datos
*   **Base de Datos Propia:** Esquemas y tablas relacionales alojadas en Supabase (Gestión de usuarios, registro de rutas ecológicas, historial de reservas y capacidad de carga/aforo diario).
*   **Datos Externos (APIs de terceros):** Consumo de APIs para pronóstico del clima en la subregión de Urabá y pasarelas de pago para confirmación de reservas.

### 3. Documentación
*   **Especificaciones Arquitectónicas:** Diagramas de arquitectura del sistema, modelo entidad-relación y definición de flujos Git (Branching Strategy).
*   **Manual de Usuario:** Guía operativa para turistas (cómo reservar) y para administradores ambientales (cómo gestionar el aforo).
*   **Manual Técnico:** Prototipos de UI/UX (Figma/MockFlow) y documento de Product Backlog (metodología Scrum).

---

## Estrategia de Versionamiento (GitFlow)

El proyecto utiliza **Versionamiento Semántico (SemVer)** y sigue una estrategia de ramas estructurada para proteger la integridad del código:
*   `main`: Contiene el código estable en producción (protegida mediante reglas de PR).
*   `develop`: Rama de integración para pruebas antes de producción.
*   `feature/*`: Ramas temporales para el desarrollo de nuevas peticiones de cambio (OCI), como la rama `feature/control-aforo`.

> **Nota de Auditoría:** Todo cambio hacia la rama `main` requiere la aprobación mediante un Pull Request (PR) y la validación de la lista de chequeo de la Autoridad de Control de Cambios (ACC).
