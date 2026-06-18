# eslint-plugin-jsdoc-inline-type-casts

ESLint plugin for keeping inline JSDoc `@type` casts readable.

The rule rejects multi-line JSDoc comments embedded in expressions or parameter lists:

```js
const value = /**
              * Narrows the runtime value.
              * @type {string} */ (input)
```

Use a one-line inline cast when it fits:

```js
const value = /** @type {string} */ (input)
```

For complex casts, move the narrowing to a named local with a standalone JSDoc block.

## Installation

```sh
npm install --save-dev eslint-plugin-jsdoc-inline-type-casts
```

## Usage

```js
import jsdocInlineTypeCasts from "eslint-plugin-jsdoc-inline-type-casts"

export default [
  {
    plugins: {
      "jsdoc-inline-type-casts": jsdocInlineTypeCasts
    },
    rules: {
      "jsdoc-inline-type-casts/jsdoc-inline-type-casts": "error"
    }
  }
]
```

## Rule

### `jsdoc-inline-type-casts`

Requires inline JSDoc `@type` comments to stay on one line. The rule reports only block JSDoc comments that are embedded in expressions or parameter lists, so normal standalone multi-line JSDoc remains valid.

The fixer rewrites simple multi-line inline casts to a one-line comment. When the original JSDoc includes description text, that text is preserved as nearby line comments:

```js
// Narrows the runtime value.
const value = /** @type {string} */ (input)
```

It intentionally does not autofix wrapped type tags such as `Array<...>` split over multiple lines, because those should be converted to a named local instead.
