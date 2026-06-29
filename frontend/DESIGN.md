# Neo DeFi Brand & Interface System

## Creative direction

**North star: Institutional Onchain Terminal**

Neo DeFi is the protocol brand. Neo ETF is its first index product. The interface combines the discipline of an institutional execution terminal with the transparency of an onchain ledger: dark graphite surfaces, precise numerical typography, restrained grid texture, and Neo green reserved for live state and executable actions.

The product must feel technical without becoming cryptic. Contract state, wallet ownership, network identity and transaction progress remain explicit.

## Brand mark

The mark combines:

- an `N`-shaped asset path;
- three settlement nodes;
- a circular liquidity orbit.

The SVG source is implemented in `src/components/ui/BrandMark.tsx`. The application icon is `src/app/icon.svg`.

Do not replace the mark with coins, rockets, generic hexagons or unrelated chain-link symbols.

## Brand architecture

```text
Neo DeFi
└── Neo ETF
    ├── Investment / redemption engine
    ├── NETF staking layer
    ├── NRWD reward stream
    └── Sepolia asset faucet
```

## Color system

| Role | Value |
| --- | --- |
| Protocol canvas | `#070B12` |
| Primary surface | `#0D131F` |
| Raised surface | `#111A28` |
| Primary text | `#F2F7F6` |
| Secondary text | `#8491A5` |
| Neo green | `#3CF2C3` |
| Electric data accent | `#6B8CFF` |
| Warning | `#FFBA69` |
| Danger | `#FF6F83` |

Neo green is used for executable actions, selected states, live network signals and successful settlement. It is not ambient decoration.

## Typography

- Display and financial values: Space Grotesk
- Interface copy: Manrope
- Chain IDs, status labels and machine-readable metadata: system monospace
- All balances use tabular figures

## Layout

- Desktop: fixed protocol rail, sticky network header, dense workspace
- Mobile: compact brand header and five-item bottom navigation
- Primary execution pages use asymmetric two-column layouts
- Data panels may use subtle dot-grid or orbital geometry
- Mobile disables unnecessary visual density and preserves 44px minimum controls

## Components

### Panels

Panels use dark layered surfaces, translucent borders and restrained inset highlights. Identical card mosaics are avoided; hierarchy comes from scale, content density and asymmetric composition.

### Buttons

- Primary: Neo green with dark text
- Secondary: tinted green surface with green border
- Destructive/error: semantic danger surface
- Disabled: dark neutral surface with readable muted text

### Transaction state

Every write operation exposes checking, approval, execution, success and error states. Errors remain visible inside the modal rather than disappearing after wallet rejection or contract revert.

### Accessibility

- WCAG AA contrast minimum
- Visible keyboard focus
- Reduced-motion support
- Semantic dialogs and live regions
- 44px minimum interactive targets
- Mobile safe-area padding

## Avoid

- Purple/pink gradient Web3 templates
- Generic glowing hexagons
- Decorative price charts without real data
- Full-white text on black for long paragraphs
- Hidden transaction errors
- Multiple competing font or icon systems
