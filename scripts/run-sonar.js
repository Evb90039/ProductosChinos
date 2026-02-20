/**
 * Ejecuta SonarScanner desde la carpeta del proyecto para que lea sonar-project.properties
 * y sonar-local.properties (token). En Windows el wrapper npm a veces no pasa bien el cwd.
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const localPropsPath = path.join(projectRoot, 'sonar-local.properties');

let token = '';
if (fs.existsSync(localPropsPath)) {
  const content = fs.readFileSync(localPropsPath, 'utf8');
  const m = content.match(/sonar\.login\s*=\s*(.+)/);
  if (m) token = m[1].trim();
}

if (!token) {
  console.error('Crea sonar-local.properties con: sonar.login=TU_TOKEN');
  process.exit(1);
}

const sonarHome = path.join(process.env.USERPROFILE || process.env.HOME, '.sonar', 'native-sonar-scanner');
let scannerBat = '';
try {
  const dirs = fs.readdirSync(sonarHome);
  const winDir = dirs.find(d => d.includes('windows'));
  if (winDir) {
    scannerBat = path.join(sonarHome, winDir, 'bin', 'sonar-scanner.bat');
  }
} catch (_) {}

if (!scannerBat || !fs.existsSync(scannerBat)) {
  console.error('No se encontró SonarScanner en', sonarHome, '- ejecuta antes: npx sonarqube-scanner');
  process.exit(1);
}

const result = spawnSync(scannerBat, [`-Dsonar.login=${token}`], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status || 0);
