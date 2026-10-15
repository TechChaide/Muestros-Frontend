const { createServer } = require('https');
const { parse } = require('url');
const net = require('net');
const next = require('next');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PREFERRED_PORT = 9003; // Puerto preferido
const PORT_RANGE_END = 9010;  // Rango máximo a probar (9002-9010)

const httpsOptions = {
  key: fs.readFileSync('./certs/localhost-key.pem'),
  cert: fs.readFileSync('./certs/localhost.pem'),
};

/**
 * Verifica si un puerto está disponible en el host local.
 * @param {number} port - Puerto a comprobar.
 * @returns {Promise<boolean>} true si está libre, false si está ocupado.
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port, '0.0.0.0');
  });
}

/**
 * Busca el primer puerto disponible dentro del rango [preferredPort, endPort].
 * Si ninguno está libre, devuelve null.
 */
async function findAvailablePort(preferredPort, endPort) {
  for (let port = preferredPort; port <= endPort; port++) {
    // eslint-disable-next-line no-await-in-loop
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    console.warn(`⚠️  Puerto ${port} ocupado, probando el siguiente...`);
  }
  return null;
}

app.prepare().then(async () => {
  const port = await findAvailablePort(PREFERRED_PORT, PORT_RANGE_END);

  if (port === null) {
    console.error(
      `❌ Ningún puerto disponible en el rango ${PREFERRED_PORT}-${PORT_RANGE_END}.`
    );
    process.exit(1);
  }

  if (port !== PREFERRED_PORT) {
    console.log(
      `ℹ️  Puerto preferido ${PREFERRED_PORT} no disponible. Usando ${port}.`
    );
  }

  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, '0.0.0.0', (err) => {
    if (err) {
      console.error(`❌ Error al iniciar el servidor:`, err);
      process.exit(1);
    }
    console.log(`> Ready on https://localhost:${port}`);
  });
});