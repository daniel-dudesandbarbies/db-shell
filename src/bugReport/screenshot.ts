import { toBlob } from 'html-to-image'

// Vykreslí aktuální obsah stránky (ne systémový screenshot okna/plochy) do
// PNG blobu, čistě v prohlížeči - žádné povolení, nic se nikam neposílá
// předem. Vyloučí cokoli označené `db-shell__no-screenshot` (samotný
// bug-report modal), ať appka nefotí sama sebe.
//
// Nikdy nesmí selhání vyhodit chybu ven - neúspěšný screenshot nesmí
// zablokovat zbytek reportu (popis + konzole jsou užitečné i samy o sobě).
export async function captureScreenshot(): Promise<Blob | null> {
  try {
    return await toBlob(document.body, {
      filter: (node) => {
        if (!(node instanceof Element)) return true
        return !node.classList?.contains('db-shell__no-screenshot')
      },
    })
  } catch (err) {
    console.error('[bugReport] captureScreenshot selhal:', err)
    return null
  }
}
