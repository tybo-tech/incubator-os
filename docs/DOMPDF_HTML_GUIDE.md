# DomPDF HTML Generation Guide

> Reference for any developer building server-side PDF exports in this project.  
> DomPDF runs on the PHP backend and does **not** execute JavaScript or support modern CSS.

---

## The Golden Rule

**Write HTML like it's 2005 email.** Table-based layouts, inline styles, no flex, no grid, no external CSS.

This is the correct architecture already in use:

- Angular generates a self-contained HTML string
- That string is sent to `PdfService.downloadPdf(html, filename, size, orientation)`
- The PHP backend passes it to DomPDF
- DomPDF renders it server-side

Do **not** try to capture Angular component output or reuse Tailwind markup. Always build a dedicated HTML string.

---

## CSS — What Works vs What Breaks

### ✅ Safe to use

| Property | Notes |
|----------|-------|
| `font-family` | Use `DejaVu Sans, sans-serif` — it ships with DomPDF |
| `color`, `background` | Hex values work reliably |
| `border`, `border-top/bottom/left/right` | Fully supported |
| `padding`, `margin` | Works, but prefer padding on `<td>` |
| `font-size`, `font-weight` | Fully supported |
| `text-align`, `vertical-align` | Fully supported |
| `width` (on `<td>`) | Use `%` or `px` attributes, not CSS width alone |
| `@page { margin: 16px; }` | Works — use for page margins |
| `page-break-inside: avoid` | Works on `tr`, `td`, `table` |

### ❌ Avoid or use with caution

| Property | Problem | Alternative |
|----------|---------|-------------|
| `border-radius` | Partially supported; circles fail; clipped backgrounds fail | Flat backgrounds |
| `display: inline-block` | Inconsistent inside `<td>` | Nested `<table>` |
| `display: flex` / `grid` | **Not supported** | Tables |
| `overflow: hidden` | Ignored — content will overflow | Two-cell table bars |
| `box-sizing: border-box` | Inconsistent | Remove it |
| `-webkit-print-color-adjust` | Ignored by DomPDF | Remove it |
| `print-color-adjust` | Ignored by DomPDF | Remove it |
| `white-space: nowrap` | Can overflow page on long content | Use sparingly; never on dynamic data |
| `letter-spacing` | Usually fine, but can misalign bold text | Test it |
| `line-height` | Partially supported | Keep simple |
| SVG | Partially supported; complex paths may fail | Use HTML entities or Unicode |
| Canvas / Charts | **Not supported** | Pre-computed stats only |

---

## Font Family

### Always use DejaVu Sans

```ts
const FF = `font-family:'DejaVu Sans',sans-serif`;
```

**Why:** DejaVu Sans ships bundled with DomPDF. It supports UTF-8, accents, African language characters, and symbols. `Trebuchet MS`, `Inter`, `Roboto`, etc. may not exist on the server container and will fall back unpredictably.

### Apply font-family everywhere — not just in CSS

DomPDF does **not** inherit `font-family` from the `*` selector or `body` into `<td>` and `<th>`. You must set it:

1. In the CSS block:
   ```css
   body { font-family: 'DejaVu Sans', sans-serif; }
   td, th { font-family: 'DejaVu Sans', sans-serif; }
   ```

2. As an inline style on every `<td>`, `<th>`, `<span>`, `<div>`:
   ```ts
   const FF = `font-family:'DejaVu Sans',sans-serif`;
   // then use ${FF} on every element
   ```

If you skip inline `font-family`, elements inside complex nested tables will fall back to a default serif font.

---

## Recommended CSS Block Template

```html
<style>
  @page { margin: 16px; }
  * { margin: 0; padding: 0; }
  body {
    font-family: 'DejaVu Sans', sans-serif;
    font-size: 12px;
    color: #1a1a2e;
    background: #ffffff;
  }
  table { border-collapse: collapse; }
  td, th {
    vertical-align: top;
    font-family: 'DejaVu Sans', sans-serif;
    font-size: 12px;
    page-break-inside: avoid;
  }
  tr { page-break-inside: avoid; }
</style>
```

Do **not** include `box-sizing`, `print-color-adjust`, or any flex/grid rules.

---

## Badges and Chips

### ❌ Wrong — inline-block breaks in DomPDF

```html
<span style="display:inline-block;background:#d1fae5;border-radius:4px;padding:3px 8px">
  Applied
</span>
```

### ✅ Correct — nested table

```html
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
  <tr>
    <td style="background:#d1fae5;color:#065f46;padding:3px 10px;font-size:10px;font-weight:700;
      font-family:'DejaVu Sans',sans-serif">
      Applied
    </td>
  </tr>
</table>
```

To center a badge inside a table cell:

```html
<td style="text-align:center">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;border-collapse:collapse">
    <tr>
      <td style="background:#d1fae5;color:#065f46;padding:3px 10px">Applied</td>
    </tr>
  </table>
</td>
```

---

## Progress Bars

### ❌ Wrong — div fill with overflow:hidden

```html
<td style="background:#f3f4f6;overflow:hidden;height:10px;width:200px">
  <div style="width:75%;height:10px;background:#10b981"></div>
</td>
```

DomPDF ignores `overflow:hidden` — the fill div may render outside the bar.

### ✅ Correct — two-cell table

```html
<table width="200" style="border-collapse:collapse;height:10px">
  <tr>
    <td width="75%" style="background:#10b981;height:10px;padding:0;font-size:0">&nbsp;</td>
    <td style="background:#f3f4f6;height:10px;padding:0;font-size:0">&nbsp;</td>
  </tr>
</table>
```

Key details:
- `font-size:0` prevents the `&nbsp;` from adding height
- `width` on the first cell is a percentage string, e.g. `"${pct}%"`
- If `pct` is 0, omit the first cell entirely (a 0-width `<td>` can cause layout bugs)

---

## Circular Dots / Indicators

### ❌ Risky — border-radius:50%

```html
<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6"></span>
```

Often renders as a square in DomPDF.

### ✅ Safe — Unicode bullet with color

```html
<span style="color:#3b82f6;font-size:14px;vertical-align:middle;margin-right:6px">&bull;</span>
```

---

## Page Breaking

Add these to your CSS block and they will prevent content from being cut in half across pages:

```css
tr { page-break-inside: avoid; }
td { page-break-inside: avoid; }
table { page-break-inside: avoid; }
```

For section-level blocks that should never split (e.g. a question block with chart):

```html
<table style="page-break-inside:avoid">
```

---

## SVG in DomPDF

Simple SVG paths render, but complex ones may not. For icons:

- Simple checkmarks and warning triangles: generally work
- Gradients, masks, `clip-path`: avoid
- If in doubt, replace with a Unicode character or leave it out

---

## PHP Backend Requirements

For large reports (many applicants, form analytics), ensure these are set in the PDF endpoint:

```php
ini_set('memory_limit', '512M');
set_time_limit(120);

$options->set('isRemoteEnabled', false);   // no external URLs in HTML
$options->set('isHtml5ParserEnabled', true);
```

---

## Pre-flight Checklist

Before sending HTML to DomPDF, verify:

- [ ] Font is `DejaVu Sans` — not Trebuchet, Inter, Roboto, or any web font
- [ ] `font-family` is set inline on every `<td>`, `<th>`, `<span>`, `<div>`
- [ ] No `display:flex` or `display:grid` anywhere
- [ ] No `display:inline-block` — replaced with nested `<table>`
- [ ] No `overflow:hidden` — progress bars use two-cell tables
- [ ] No `border-radius:50%` — replaced with `&bull;` or similar
- [ ] No `box-sizing:border-box` in CSS
- [ ] No `-webkit-print-color-adjust` or `print-color-adjust` in CSS
- [ ] `page-break-inside:avoid` on `tr`, `td`, section tables
- [ ] `@page { margin: 16px; }` in the CSS block
- [ ] `white-space:nowrap` only on fixed-width numeric cells, never on dynamic text
- [ ] No external URLs, fonts, or images (or `isRemoteEnabled` is true)

---

## Quick Reference: Palette Used in Grant PDF

Stage badge colors (matched to workflow `color` field):

```ts
const stagePalette = {
  blue:   { bg: '#dbeafe', text: '#1d4ed8' },
  orange: { bg: '#ffedd5', text: '#c2410c' },
  teal:   { bg: '#ccfbf1', text: '#0f766e' },
  indigo: { bg: '#e0e7ff', text: '#4338ca' },
  red:    { bg: '#fee2e2', text: '#dc2626' },
  green:  { bg: '#dcfce7', text: '#15803d' },
  purple: { bg: '#f3e8ff', text: '#7c3aed' },
  yellow: { bg: '#fef9c3', text: '#a16207' },
  gray:   { bg: '#f3f4f6', text: '#374151' },
};
```

Consistency label colors:

| Label | Background | Text |
|-------|-----------|------|
| Consistent | `#d1fae5` | `#065f46` |
| Moderate | `#fef3c7` | `#92400e` |
| Irregular | `#fee2e2` | `#991b1b` |
