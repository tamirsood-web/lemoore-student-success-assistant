# Design System

A framework-neutral design system implemented in plain HTML and CSS.
No build tooling, no JavaScript framework, no preprocessor required.

---

## Architecture

```
design-system/
├── tokens/
│   ├── primitives.css   — Layer 1: raw values
│   ├── semantic.css     — Layer 2: role-based aliases
│   ├── components.css   — Layer 3: component-scoped tokens
│   └── tokens.json      — All tokens in DTCG-compatible format
└── components/
    └── button/
        ├── button.css        — Component styles
        ├── button-demo.html  — Visual reference
        └── README.md         — Usage and accessibility docs
```

---

## Token layers

Tokens are split into three layers. Each layer only references the layer below it. Component CSS only references component-layer tokens.

### Layer 1 — Primitives (`tokens/primitives.css`)

Raw, context-free values: hex colors, pixel sizes, font names. Nothing here implies a role or a component.

```css
--primitive-color-blue-900: #134571;
--primitive-space-24: 24px;
```

### Layer 2 — Semantic (`tokens/semantic.css`)

Role-based aliases. Maps primitives to design intent: action, surface, ghost, text, focus, disabled. No component names at this level.

```css
--semantic-color-action-bg-default: var(--primitive-color-blue-900);
--semantic-color-text-muted:        var(--primitive-color-gray-600);
```

### Layer 3 — Components (`tokens/components.css`)

Component-scoped tokens that map semantic roles to component API names. Component stylesheets consume only this layer.

```css
--btn-primary-bg:      var(--semantic-color-action-bg-default);
--btn-primary-color:   var(--semantic-color-text-on-action);
```

### `tokens.json`

All tokens in DTCG-compatible JSON format with `{alias}` references preserving the full Primitive → Semantic → Component chain. Use this as the source of truth for tooling integration (Style Dictionary, Theo, etc.).

---

## Required load order

Every page that uses a component must load the token layers first, in order:

```html
<link rel="stylesheet" href="path/to/tokens/primitives.css" />
<link rel="stylesheet" href="path/to/tokens/semantic.css" />
<link rel="stylesheet" href="path/to/tokens/components.css" />
<!-- then component stylesheets -->
<link rel="stylesheet" href="path/to/components/button/button.css" />
```

---

## Adding a new component

1. **Inspect the Figma component** and collect all bound variables and resolved values.

2. **Add primitive tokens** for any new raw values in `tokens/primitives.css`. Reuse existing primitives where possible.

3. **Add semantic tokens** in `tokens/semantic.css` if the new component introduces a new role (e.g. `--semantic-color-feedback-error`). Skip this step if existing semantics cover the component.

4. **Add component tokens** in `tokens/components.css` using the pattern `--{component}-{variant}-{property}-{state}`. All values must reference semantic tokens.

5. **Create the component folder** at `components/{component-name}/` containing:
   - `{component}.css` — styles consuming only `--{component}-*` tokens
   - `{component}-demo.html` — visual reference with all variants and states
   - `README.md` — variants, states, HTML usage, and accessibility notes

6. **Update `tokens.json`** with the new tokens following the existing Primitive → Semantic → Component structure.

---

## Modifying an existing value

| What changed | Where to edit |
|---|---|
| A raw color, size, or font | `tokens/primitives.css` |
| How a role maps to a primitive | `tokens/semantic.css` |
| How a component maps to a role | `tokens/components.css` |
| Component layout rules | `components/{name}/{name}.css` |

Always update `tokens.json` to match any CSS change.

---

## Components

| Component | Variants | Demo |
|---|---|---|
| [Button](components/button/README.md) | primary, secondary, clean, icon | [button-demo.html](components/button/button-demo.html) |
