# AI Rules for the Design System

## Purpose

This project implements a production-ready design system directly from the Figma source of truth.

Every generated component must faithfully reproduce the Figma component without inventing design decisions.

---

# Source of Truth

The Figma Design System is the only source of truth.

Never:

- invent colors

- invent spacing

- invent typography

- invent border radius

- invent shadows

- invent animations

- invent states

If a value cannot be found, inspect the Figma component again.

---

# Tokens

Never hardcode design values.

Always use existing tokens from

design-system/tokens/

including

- primitives.css

- semantic.css

- components.css

If a token is missing:

1. inspect Figma again

2. verify that the token truly does not exist

3. only then propose creating a new token

Never silently create new tokens.

---

# Component Architecture

Each component lives in its own folder.

Example

design-system/components/button/

contains

- button.css

- button-demo.html

- README.md

Component CSS must never redefine tokens.

---

# HTML

Use semantic HTML only.

Accessibility is mandatory.

Use

- label

- button

- input

- textarea

- fieldset

- legend

when appropriate.

Avoid unnecessary wrappers.

---

# CSS

Use plain CSS.

No

- SCSS

- LESS

- Tailwind

- Bootstrap

- CSS frameworks

Component CSS must contain only component styles.

No token definitions.

---

# JavaScript

Do not generate JavaScript unless explicitly requested.

Interactive states should be demonstrated using HTML and CSS only.

---

# Demo Pages

Every component must include a demo page.

The demo page should present every Figma variant.

Include all supported states.

Examples:

- default

- hover

- focus-visible

- active

- disabled

- selected

- error

- success

- loading

The demo page is for visual verification only.

---

# Naming

Use descriptive class names.

Prefer

button

button--primary

button--secondary

instead of

btn1

btn2

Follow a consistent BEM-style convention.

---

# Icons

Do not embed SVGs inside CSS.

Icons should be separate assets or inline SVG in HTML.

---

# Typography

Never hardcode

font-family

font-size

font-weight

line-height

Always use tokens.

---

# Colors

Never write

#123456

rgb()

hsl()

inside component CSS.

Always reference CSS variables.

---

# Spacing

Never hardcode spacing values when a token exists.

Use spacing tokens.

---

# Borders

Never assume border radius or border width.

Read the exact values from Figma.

---

# Component Generation Workflow

Before generating a component:

1. Inspect the Figma component.

2. Read all variants.

3. Read all component properties.

4. Read all variables.

5. Read all interactions.

6. Read all states.

Only then generate code.

---

# Accuracy

Pixel-perfect implementation is required.

If there is uncertainty, inspect Figma again.

Never guess.
