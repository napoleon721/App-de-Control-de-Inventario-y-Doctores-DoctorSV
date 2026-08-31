# 🏥 DoctorSV · Control de Espacios, Médicos e Inventario

Sistema de gestión y control físico-arquitectónico de 140 cubículos de telemedicina, padrón médico, turnos y auditoría de inventario de hardware para la **Sede San Miguel**.

![DoctorSV](public/doctorsv_logo.png)

---

## 🚀 Características Principales

* 🗺️ **Plano Arquitectónico Interactivo**: Visualización simétrica y exacta de los 140 puestos de trabajo distribuidos en Ala Izquierda (Módulos A1, A2, A3), Ala Derecha (Módulos B2, B3, B4) y Módulos Superiores (Módulo 55-70 y Módulo B1 71-86) junto al acceso principal y salidas de emergencia.
* 🩺 **Padrón de Médicos & Asignación de Turnos**: Integración con el catálogo de 194 médicos y personal con filtros por modalidad (*Planilla, Servicios Profesionales, Supervisores*), turnos rotativos y asignación instantánea a cubículos.
* 📦 **Inventario de Bodega & Control de Hardware**: Control de stock de piezas (PC, Mouse, Headset, Hub, Monitor, Ethernet) con cálculo de deltas y tabla consolidada de activos por marca (*DELL, LENOVO, HP*).
* 📝 **Bitácora de Auditoría e Historial**: Registro histórico de movimientos de equipo, traslados, mantenimientos, reemplazos por falla y observaciones de infraestructura.
* 🔄 **Persistencia en Tiempo Real**: Almacenamiento local automático y arquitectura preparada para conexión bidireccional con **Google Sheets**.

---

## 🛠️ Tecnologías

* **Frontend**: React 18 + Vite 6
* **Estilos**: Tailwind CSS + Glassmorphism + Lucide React Icons
* **Gráficos**: Recharts
* **Tipografías**: Plus Jakarta Sans, Outfit, JetBrains Mono

---

## 💻 Instalación y Ejecución Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/napoleon721/App-de-Control-de-Inventario-y-Doctores-DoctorSV.git

# 2. Entrar a la carpeta del proyecto
cd App-de-Control-de-Inventario-y-Doctores-DoctorSV

# 3. Instalar dependencias
npm install

# 4. Iniciar el servidor de desarrollo
npm run dev
```

El servidor local se iniciará en `http://localhost:3000/`.

---

## 📦 Construcción para Producción

```bash
npm run build
```
