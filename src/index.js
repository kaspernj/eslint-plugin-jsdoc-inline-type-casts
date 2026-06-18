// @ts-check

import jsdocInlineTypeCastsRule from "./rules/jsdoc-inline-type-casts.js"

/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
  rules: {
    "jsdoc-inline-type-casts": jsdocInlineTypeCastsRule
  }
}

export const rules = plugin.rules
export default plugin
