// Appky dnes nemají žádný mechanismus na zachycení konzolového výstupu -
// tenhle modul appce od jejího úplného startu tiše "poslouchá" vlastní
// console.log/warn/error a neodchycené chyby do malého bufferu v paměti.
// Nikam se to samo neposílá - obsah se přečte a přibalí k reportu, až
// uživatel sám klikne na "Nahlásit chybu" (viz BugReportModal).

export interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'window-error' | 'unhandledrejection'
  message: string
  ts: number
}

const MAX_ENTRIES = 50
const MAX_MESSAGE_CHARS = 500

const buffer: ConsoleEntry[] = []
let initialized = false

// Základní začernění, ne vyčerpávající - zachytí nejčastější náhodný únik
// (Bearer token, JWT ve tvaru header.payload.signature) dřív, než se
// cokoli vůbec uloží do bufferu, natož pošle dál na Vikunju/do databáze.
function scrub(message: string): string {
  return message
    .replace(/Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi, 'Bearer [redacted]')
    .replace(/[\w-]+\.[\w-]+\.[\w-]{10,}/g, '[redacted-jwt]')
}

function push(level: ConsoleEntry['level'], message: string): void {
  buffer.push({ level, message: scrub(message).slice(0, MAX_MESSAGE_CHARS), ts: Date.now() })
  if (buffer.length > MAX_ENTRIES) buffer.shift()
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

/**
 * Zapíná zachytávání konzole. Volat jednou, co nejdřív při startu appky
 * (první příkaz v main.tsx/main.jsx, před vykreslením) - jinak appka
 * nezachytí chyby z vlastního startu (např. selhání AuthProvideru).
 */
export function initBugReportCapture(): void {
  if (initialized) return
  initialized = true

  const original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  }

  console.log = (...args: unknown[]) => {
    push('log', args.map(stringifyArg).join(' '))
    original.log(...args)
  }
  console.warn = (...args: unknown[]) => {
    push('warn', args.map(stringifyArg).join(' '))
    original.warn(...args)
  }
  console.error = (...args: unknown[]) => {
    push('error', args.map(stringifyArg).join(' '))
    original.error(...args)
  }

  window.addEventListener('error', (e: ErrorEvent) => {
    push('window-error', `${e.message} @ ${e.filename}:${e.lineno}`)
  })
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    push('unhandledrejection', stringifyArg(e.reason))
  })
}

/** Kopie aktuálního obsahu bufferu - appka ho čte při odeslání reportu. */
export function getBugReportBuffer(): ConsoleEntry[] {
  return [...buffer]
}
