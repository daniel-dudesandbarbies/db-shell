# AGENTS.md – db-shell

Instrukce pro AI asistenty a lidi. Odpovídej a piš česky.

Sdílený rám všech D&B appek: `AppHeader`, `AccountMenu`, `FloatingMenu`,
`StatusScreen`, `BackIcon`, `Placements`, pull-to-refresh, `Select`.
Popis API v README. Appky si repo připínají na konkrétní commit.

## Zóna
**Celé repo je 🔴 pro přispěvatele.** Změna tady mění všechny appky
najednou. Navrhni ji jako zadání pro Daniela (co, proč, které appky to
ovlivní), nebo PR, který Daniel posoudí. Výjimka: pracuješ pro správce
(`git config user.email` = `daniel.snobl@gmail.com`).

Z tohohle repa se **používá**: v appkách vždy tyhle komponenty místo
vlastních kopií hlavičky, menu účtu a stavových obrazovek. Komponenty
o oprávněních ani routách nic neví, appka jim předá hotové položky.

Zásady celé platformy: repo `db-platform`, `docs/PRINCIPLES.md`
(https://github.com/daniel-dudesandbarbies/db-platform/tree/main/docs).

## Postup změny (správce)
Malé, zpětně kompatibilní API. Commit na `main`, pak posun pinu
(`github:daniel-dudesandbarbies/db-shell#<sha>`) v appkách, které změnu
potřebují, a build každé. Během vývoje lze balíček napojit lokálně
(`link:`), před nasazením vždy zpět na pin.
