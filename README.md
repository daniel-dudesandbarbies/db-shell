# @db/shell

Sdílený „rám“ všech D&B appek (redesign 2026-10): jednotná modrá hlavička,
menu účtu, plovoucí bublina s navigací na telefonu a modré mezistránky.
Barvy a zaoblení přebírá z `@db/design-tokens`.

## Použití

```tsx
import { AppHeader, buildContentNavItems, StatusScreen } from '@db/shell'
import '@db/shell/styles.css'

<AppHeader
  logoHref={HOMEPAGE_URL}                     // logo + domeček vedou na homepage
  logoSrc="/db-logo-white.png"                // bílé logo z appky's /public
  navItems={buildContentNavItems(permissions, {
    baseUrl: INTERNAL_PLATFORM_URL,           // Procesy, Bible, Struktura…
    planningUrl: PLANNING_URL,                // … a Plán aktivit (podle oprávnění)
    activePath: pathname,                     // jen appka sama sobě - zvýrazní sekci
  })}
  account={{
    email, fullName, roleLabel,
    links: [{ label: 'Nastavení', href: `${CENTRAL_AUTH_URL}/settings` }],
    onSignOut,
  }}
/>

// Načítání / přesměrování (bez obsahu = jen modrá plocha):
<StatusScreen logoSrc="/db-logo-white.png" />
```

- **AppHeader**: logo vlevo, domeček (Domů), obsahové pilulky a iniciály
  vpravo. Na telefonu jsou pilulky v plovoucí bublině (`FloatingMenu`).
- **Menu účtu**: jen „Nastavení“ (rozcestník v central-auth `/settings`)
  a odhlášení. Appka může přidat řádky přes `children`, např.
  `AccountMenuToggle` (homepage's „Animace“).
- **StatusScreen**: modrá mezistránka. Obsah stylují třídy
  `db-status__btn`, `__error`, `__form`, `__input`, `__link`, `__badge`.
- Dále `usePullToRefresh` + `PullToRefreshIndicator`, `Spinner`,
  `hasAdminAccess`, `hasInternalPlatformDomainAccess`.

Komponenty o oprávněních ani routách nic nevědí. Appka jim předá už
vyfiltrované položky.

## Verzování

Appky si balíček připínají na konkrétní commit
(`github:daniel-dudesandbarbies/db-shell#<sha>`). Po změně tady je potřeba
v appce posunout pin a spustit install.
