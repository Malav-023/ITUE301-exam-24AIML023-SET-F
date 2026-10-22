/**
 * Tiny dependency-free logger.
 *  - Console output (coloured when attached to a terminal)
 *  - JSON-lines files: logs/app.log (everything) and logs/error.log (errors only)
 *  - LOG_LEVEL env var controls verbosity: error | warn | info | debug
 *
 * NEVER pass passwords, tokens or full request bodies in `meta`.
 */
const fs = require('fs');
const path = require('path');
const util = require('util');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[34m', debug: '\x1b[90m' };
const RESET = '\x1b[0m';
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const useColor = Boolean(process.stdout.isTTY);

try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (err) {
  console.error('Could not create log directory:', err.message);
}

const threshold = () => LEVELS[(process.env.LOG_LEVEL || 'debug').toLowerCase()] ?? LEVELS.debug;

const jsonReplacer = (_key, value) =>
  value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;

const appendLine = (file, line) => {
  fs.appendFile(path.join(LOG_DIR, file), `${line}\n`, (err) => {
    if (err) console.error('Log write failed:', err.message);
  });
};

function write(level, message, meta) {
  if (LEVELS[level] > threshold()) return;

  const time = new Date().toISOString();
  const hasMeta = meta !== undefined && meta !== null;
  const label = level.toUpperCase().padEnd(5);
  const coloredLabel = useColor ? `${COLORS[level]}${label}${RESET}` : label;
  const metaText = hasMeta ? ` ${util.inspect(meta, { depth: 4, breakLength: 140 })}` : '';
  const line = `${time} ${coloredLabel} ${message}${metaText}`;

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  const entry = JSON.stringify({ time, level, message, ...(hasMeta ? { meta } : {}) }, jsonReplacer);
  appendLine('app.log', entry);
  if (level === 'error') appendLine('error.log', entry);
}

module.exports = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  debug: (message, meta) => write('debug', message, meta),
};
