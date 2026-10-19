// Šipka zpět - kolečko se šipkou z "logo internal platfrom/backico.svg"
// (cesty převzaté beze změny). Barvy přes CSS (.db-back-icon), ať jde i
// obrácená varianta na modré ploše: bílé kolečko, modrá šipka.
export function BackIcon({ size = 28, inverse = false }: { size?: number; inverse?: boolean }) {
  return (
    <svg
      className={`db-back-icon${inverse ? ' db-back-icon--inverse' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      aria-hidden
    >
      <circle cx="25" cy="25" r="25" />
      <path d="M29 12L18 25L29 39.5" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}
