# Configuración de SonarQube para Productos Chinos

Esta guía te permite levantar SonarQube en tu máquina y analizar el proyecto.

## Requisitos

- **Docker** y **Docker Compose** instalados.  
  Si no los tienes: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) o Docker Engine + Compose en Linux.

## 1. Levantar SonarQube

En la raíz del proyecto (donde está `docker-compose.sonar.yml`):

```bash
docker compose -f docker-compose.sonar.yml up -d
```

La primera vez descargará las imágenes y puede tardar unos minutos. SonarQube arranca en segundo plano.

- **URL:** http://localhost:9000  
- Espera 1–2 minutos hasta que la página cargue (el arranque es lento).

## 2. Primer acceso

1. Abre http://localhost:9000 en el navegador.
2. **Usuario:** `admin`  
3. **Contraseña:** `admin`  
4. Te pedirá cambiar la contraseña; pon una nueva y guárdala.

## 3. Crear el proyecto en SonarQube

1. Arriba a la derecha: **"+"** → **"Create project manually"**.
2. **Project key:** `productos-chinos` (debe coincidir con `sonar.projectKey` en `sonar-project.properties`).
3. **Display name:** `Productos Chinos` (o el que quieras).
4. **"Set Up"** → elige **"Locally"**.
5. **Generate a token:** pon un nombre (ej. `productos-chinos-token`) → **"Generate"**.
6. **Copia el token** y guárdalo; no se vuelve a mostrar.

## 4. Instalar dependencias del proyecto

En la raíz del proyecto (el script y la dependencia ya están en `package.json`):

```bash
npm install
```

## 5. Ejecutar el análisis

Desde la **raíz del proyecto**, con el token que generaste en el paso 3.

**En PowerShell (Windows)** usa comillas para que no falle el parámetro:

```powershell
npm run sonar -- "-Dsonar.login=TU_TOKEN_AQUI"
```

O con npx:

```powershell
npx sonarqube-scanner "-Dsonar.login=TU_TOKEN_AQUI"
```

Sustituye `TU_TOKEN_AQUI` por el token que copiaste. Si prefieres no poner el token en la consola, puedes usar la variable de entorno:

```powershell
$env:SONAR_LOGIN="tu_token_aqui"
npm run sonar
```

## 6. Ver resultados en SonarQube

1. Abre http://localhost:9000.
2. Entra en el proyecto **Productos Chinos**.
3. Verás issues, código duplicado, seguridad, etc. Puedes filtrar por severidad y tipo.

## Comandos útiles

| Acción              | Comando |
|---------------------|--------|
| Levantar SonarQube  | `docker compose -f docker-compose.sonar.yml up -d` |
| Ver logs            | `docker compose -f docker-compose.sonar.yml logs -f sonarqube` |
| Parar SonarQube     | `docker compose -f docker-compose.sonar.yml down` |
| Parar y borrar datos| `docker compose -f docker-compose.sonar.yml down -v` |

## Cobertura de tests (opcional)

Para ver cobertura en SonarQube:

1. Genera el reporte con Angular:
   ```bash
   npx ng test --code-coverage --watch=false
   ```
2. En `sonar-project.properties` descomenta las líneas de `sonar.javascript.lcov.reportPaths` y `sonar.typescript.lcov.reportPaths` y apunta a la ruta donde se genere `lcov.info` (por ejemplo `coverage/lcov.info`).
3. Vuelve a ejecutar el scanner.

## Problemas frecuentes

- **"SonarQube no carga"**: espera 1–2 minutos tras `up -d`; revisa logs con `docker compose -f docker-compose.sonar.yml logs -f sonarqube`.
- **"Invalid token"**: genera un nuevo token en SonarQube (Project → Security → Generate New Token).
- **Puerto 9000 ocupado**: en `docker-compose.sonar.yml` cambia `"9000:9000"` por otro, por ejemplo `"9001:9000"`, y en `sonar-project.properties` pon `sonar.host.url=http://localhost:9001`.
