import { toBlob } from 'html-to-image'

// Vykreslí aktuální obsah stránky (ne systémový screenshot okna/plochy) do
// PNG blobu, čistě v prohlížeči - žádné povolení, nic se nikam neposílá
// předem. Vyloučí cokoli označené `db-shell__no-screenshot` (samotný
// bug-report modal), ať appka nefotí sama sebe.
//
// Nikdy nesmí selhání vyhodit chybu ven - neúspěšný screenshot nesmí
// zablokovat zbytek reportu (popis + konzole jsou užitečné i samy o sobě).
// Průhledný 1x1 PNG - náhrada za obrázek, co se nepodaří načíst (rozbitá
// URL dlaždicové ikony, Google avatar bez CORS...). Bez tohohle html-to-image
// při jediném nenačteném <img> shodí CELÝ screenshot (viz "Failed to fetch"
// v konzoli) - homepage má oproti central-auth/internal-platform-oz víc
// externích obrázků (dlaždicové ikony, avatary), proto se tam projevovalo
// nejvíc.
const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

export async function captureScreenshot(): Promise<Blob | null> {
  try {
    return await toBlob(document.body, {
      filter: (node) => {
        if (!(node instanceof Element)) return true
        return !node.classList?.contains('db-shell__no-screenshot')
      },
      imagePlaceholder: TRANSPARENT_PIXEL,
      skipFonts: true,
    })
  } catch (err) {
    console.error('[bugReport] captureScreenshot selhal:', err)
    return null
  }
}
