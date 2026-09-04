# @db/shell

Jedna vizuálně identická globální hlavička napříč celým D&B ekosystémem
(central-auth, homepage, i appky mimo monorepo jako `db-internal-platform`)
— logo (proklik na homepage odkudkoli), permission-aware nav (appka
předává jen položky, na které má uživatel právo), hranaté UserMenu
s volitelným odkazem na central-auth's administraci, hamburger menu na
mobilu.

## Použití

```tsx
import { GlobalHeader, hasAdminAccess } from '@db/shell'
import '@db/shell/styles.css'

<GlobalHeader
  logoHref="https://db-homepage.pages.dev"
  logoSrc="/db-logo-mark.png"
  navItems={[
    { label: 'Org struktura', href: '/org', active: pathname === '/org' },
    // appka si sama vyfiltruje jen položky, na které má uživatel právo
  ]}
  user={{ email, avatarUrl, fullName }}
  onSignOut={signOut}
  adminHref={hasAdminAccess(claims?.permissions) ? `${CENTRAL_AUTH_URL}/admin` : undefined}
  onRefresh={refreshSession}
/>
```

Komponenta o permissions/routách nic neví — appka jí předá už
předfiltrovaný `navItems` a spočítaný `adminHref`.

## Barvy

Hlavička sedí na `--db-color-accent` (růžová) a obsah je vždy
`--db-color-on-accent` (bílá, nezávisle na dark módu — na rozdíl od
`--db-color-fg`, který se překlápí). Oba tokeny žijí v
[`@db/design-tokens`](https://github.com/daniel-dudesandbarbies/db-design-tokens),
který si tenhle balíček importuje sám.

## Instalace odjinud

```json
"@db/shell": "git+https://github.com/daniel-dudesandbarbies/db-shell.git#main"
```

(Vždy `git+https://`, ne `github:` shorthand — jinak npm's lockfile
normalizuje na SSH a Cloudflare Pages's build bez SSH klíče selže.)
