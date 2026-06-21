---
name: Neo ETF
description: A calm, trustworthy interface for an onchain index product.
colors:
  primary: "#2559D6"
  primary-strong: "#1746BA"
  primary-soft: "#EAF0FF"
  ink: "#17233D"
  muted: "#5F6C86"
  canvas: "#F5F7FB"
  surface: "#FFFFFF"
  line: "#DCE3EF"
  success: "#087A52"
  warning: "#A45B0A"
  danger: "#C53645"
  token-netf: "#163D91"
  token-nbtc: "#F59E0B"
  token-neth: "#6478EF"
  token-usdc: "#2775CA"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "14px 20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Neo ETF

## Overview

**Creative North Star: "The Clear Ledger"**

Neo ETF should feel like a well-organized financial ledger translated into a modern product interface. Surfaces are quiet, numbers are decisive, and every transaction has an explicit state. The visual system rejects neon cyberpunk Web3 dashboards, decorative glassmorphism, purple gradient surfaces, and generic SaaS card mosaics.

The interface is desktop-efficient and mobile-coherent. It uses restrained blue only for navigation, primary actions, focus, and live information. Chain truth takes priority over decorative density.

**Key Characteristics:**
- Calm financial hierarchy
- Strong numerical legibility
- Explicit transaction state
- Restrained color and elevation
- Familiar product affordances

## Colors

The palette uses a cool neutral canvas with one disciplined blue accent and state colors reserved for meaning.

**The One Accent Rule.** Primary blue is used for selection, action, focus, and information. It is never ambient decoration.

## Typography

**Display Font:** Space Grotesk  
**Body Font:** Manrope

Headings are compact and confident. Body text remains highly readable, and all balances use tabular figures.

**The Data Voice Rule.** Financial values always receive stronger weight and tabular number alignment than their labels.

## Elevation

Surfaces are flat by default. Thin borders establish structure; a soft ambient shadow is reserved for primary workflow containers and dialogs.

**The Flat-By-Default Rule.** If removing a shadow breaks the hierarchy, the layout is wrong.

## Components

### Buttons
- Primary buttons use a 12px radius, strong blue fill, visible focus ring, and 150–200ms state transitions.
- Secondary actions use borders or quiet neutral fills.
- Disabled states reduce contrast and remove elevation without hiding labels.

### Cards / Containers
- Panels use 16px corners, white surfaces, cool borders, and 24px internal padding.
- Cards are used only when they group one coherent task or state.

### Inputs / Fields
- Inputs use explicit labels, 12px corners, visible blue focus rings, and adjacent validation.
- Amount fields use large tabular figures while retaining a stable footprint during loading.

### Navigation
- The sidebar uses a calm neutral layer, one selected state, 44px minimum targets, and no ornamental controls.
- Mobile navigation uses an overlay drawer with a visible close action.

## Do's and Don'ts

### Do:
- **Do** show wallet balance, selected network, and transaction state before irreversible actions.
- **Do** use status icons and text together.
- **Do** preserve layout dimensions while data loads.
- **Do** provide Etherscan evidence for submitted transactions.

### Don't:
- **Don't** use neon cyberpunk Web3 dashboards.
- **Don't** use decorative glassmorphism or purple gradient surfaces.
- **Don't** build generic SaaS card mosaics.
- **Don't** hide contract state, transaction progress, or failure causes.
- **Don't** make ordinary investors decode a terminal-style interface.
