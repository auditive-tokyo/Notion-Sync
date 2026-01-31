# 📝 NotionSync

<!-- ⚠️ AI-generated translation. Native review needed! -->
<!-- Esta traducción fue generada por IA y necesita revisión nativa. -->

> Realiza copias de seguridad automáticas de tu espacio de trabajo de Notion en GitHub con sincronizaciones programadas diariamente.

**¿Por qué?** Los desarrolladores a menudo almacenan requisitos, documentos de arquitectura y especificaciones en Notion. Esta herramienta los sincroniza con tu repositorio para que puedas ver todo en VS Code — ¡sin tener que cambiar de una aplicación a otra!

📍 **Actual:** Sincronización unidireccional (Notion → GitHub)  
🚀 **Futuro:** ¡Los PRs para sincronización bidireccional (GitHub → Notion) son bienvenidos!

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Características

- 🔄 **Sincronización Diaria Automática** - GitHub Actions se ejecuta diariamente a las 0:00 UTC
- 📄 **Exportación a Markdown** - Convierte páginas de Notion en archivos Markdown limpios
- 📊 **Soporte de Bases de Datos** - Exporta bases de datos de Notion como archivos CSV
- 🖼️ **Descarga de Imágenes** - Descarga y almacena imágenes localmente
- 📁 **Estructura Jerárquica** - Preserva la jerarquía de tus páginas de Notion
- 🚀 **Activación Manual** - Ejecuta la sincronización en cualquier momento con workflow_dispatch

## 🚀 Inicio Rápido

### 1. Usa esta plantilla

Haz clic en el botón verde **"Use this template"** → **"Create a new repository"**

> 💡 ¡Puedes hacerlo **privado** para mantener seguro tu contenido de Notion!

### 2. Obtén credenciales de API de Notion

1. Ve a [Notion Integrations](https://www.notion.so/my-integrations)
2. Haz clic en "New integration"
3. Ponle un nombre (ej: "GitHub Sync")
4. Copia el **Internal Integration Token**

### 3. Comparte tu página de Notion con la integración

1. Abre tu página de Notion que deseas sincronizar
2. Haz clic en el menú "..." → "Connections" → Agrega tu integración
3. Copia el **Page ID** de la URL:
   ```
   https://www.notion.so/Your-Page-Title-{PAGE_ID}
                                          ^^^^^^^^
   ```

### 4. Configura los GitHub Secrets

Ve a tu repositorio bifurcado → Settings → Secrets and variables → Actions

Agrega estos secrets:

| Nombre del Secret     | Valor                                  |
| --------------------- | -------------------------------------- |
| `NOTION_API_KEY`      | Tu token de integración de Notion      |
| `NOTION_ROOT_PAGE_ID` | El ID de página que deseas sincronizar |

### 5. Ejecuta la sincronización

- **Manual**: Actions → "Sync from Notion" → "Run workflow"
- **Automática**: Se ejecuta diariamente a las 0:00 UTC

## 📁 Estructura de Salida

```
root_page/
├── Your Page Title {page_id}.md
└── Your Page Title/
    ├── Child Page {page_id}.md
    ├── Database {page_id}.csv
    └── images/
        └── downloaded_image.png
```

## ⚙️ Configuración

### Variables de Entorno

| Variable              | Por Defecto | Descripción                        |
| --------------------- | ----------- | ---------------------------------- |
| `NOTION_API_KEY`      | Requerido   | Token de integración de Notion     |
| `NOTION_ROOT_PAGE_ID` | Requerido   | ID de página raíz para sincronizar |
| `DOWNLOAD_IMAGES`     | `true`      | Descargar imágenes localmente      |

### Personalizar Horario

Edita `.github/workflows/sync-from-notion.yml`:

```yaml
on:
  schedule:
    - cron: "0 0 * * *" # Cambia esta expresión cron
```

## 🔧 Bloques de Notion Soportados

- ✅ Párrafos, Encabezados (H1, H2, H3)
- ✅ Listas con viñetas y numeradas
- ✅ Listas de tareas con casillas de verificación
- ✅ Bloques de código con resaltado de sintaxis
- ✅ Citas y Llamadas de atención
- ✅ Tablas
- ✅ Imágenes (con descarga local)
- ✅ Marcadores y Enlaces
- ✅ Divisores
- ✅ Bloques desplegables
- ✅ Páginas secundarias (recursivo)
- ✅ Bases de datos (como CSV)

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Siéntete libre de:

1. Bifurcar el repositorio
2. Crear tu rama de características (`git checkout -b feature/amazing-feature`)
3. Confirmar tus cambios (`git commit -m 'Add amazing feature'`)
4. Empujar a la rama (`git push origin feature/amazing-feature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [Notion API](https://developers.notion.com/)
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - SDK oficial de Notion para JavaScript

---

⭐ ¡Si te resulta útil, dale una estrella!
