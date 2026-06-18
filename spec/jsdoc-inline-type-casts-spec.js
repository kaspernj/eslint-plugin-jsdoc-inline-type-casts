// @ts-check

import assert from "node:assert/strict"
import test from "node:test"
import {Linter} from "eslint"
import jsdocInlineTypeCastsPlugin from "../src/index.js"

const ruleName = "jsdoc-inline-type-casts/jsdoc-inline-type-casts"
const ruleMessage = "Inline JSDoc @type comments must stay on one line; move complex casts to a named local."

/**
 * Creates the flat ESLint config used by rule tests.
 * @returns {import("eslint").Linter.Config[]} ESLint config.
 */
function lintConfig() {
  return [
    {
      files: ["**/*.js"],
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      plugins: {
        "jsdoc-inline-type-casts": jsdocInlineTypeCastsPlugin
      },
      rules: {
        [ruleName]: "error"
      }
    }
  ]
}

/**
 * Runs the inline JSDoc type-cast rule against source text.
 * @param {string} source - JavaScript source.
 * @returns {import("eslint").Linter.LintMessage[]} Lint messages.
 */
function lintSource(source) {
  const linter = new Linter({configType: "flat"})

  return linter.verify(source, lintConfig(), {filename: "example.js"})
}

/**
 * Runs the inline JSDoc type-cast rule with fixes.
 * @param {string} source - JavaScript source.
 * @returns {import("eslint").Linter.FixReport} Fix report.
 */
function fixSource(source) {
  const linter = new Linter({configType: "flat"})

  return linter.verifyAndFix(source, lintConfig(), {filename: "example.js"})
}

test("allows single-line inline type casts and standalone multi-line JSDoc", () => {
  const messages = lintSource(`
    /**
     * Model class.
     * @type {typeof import("../database/record/index.js").default | undefined}
     */
    const ModelClass = undefined

    const value = /** @type {string} */ ("name")
  `)

  assert.deepEqual(messages, [])
})

test("rejects multiline inline type casts", () => {
  const messages = lintSource(`
    const value = /**
                   * Narrows the runtime value to the documented type.
                   * @type {string} */ (input)
  `)

  assert.deepEqual(messages.map((message) => message.message), [ruleMessage])
})

test("rejects multiline inline parameter type comments", () => {
  const messages = lintSource(`
    const callback = (/**
                      * @type {Error} */ error) => error
  `)

  assert.deepEqual(messages.map((message) => message.message), [ruleMessage])
})

test("rejects line-wrapped inline type casts", () => {
  const messages = lintSource(`
    const value =
      /**
       * Narrows the runtime value to the documented type.
       * @type {string} */
      (input)
  `)

  assert.deepEqual(messages.map((message) => message.message), [ruleMessage])
})

test("fixes multiline inline type casts to a single-line cast", () => {
  const report = fixSource(`
    const value = /**
                   * @type {string} */ (input)
  `)

  assert.equal(report.fixed, true)
  assert.match(report.output, /const value = \/\*\* @type \{string\} \*\/ \(input\)/)
})

test("preserves description comments when fixing multiline inline type casts", () => {
  const report = fixSource(`
    const value = /**
                   * Narrows the runtime value.
                   * @type {string} */ (input)
  `)

  assert.equal(report.fixed, true)
  assert.equal(report.output, `
    // Narrows the runtime value.
    const value = /** @type {string} */ (input)
  `)
})

test("does not autofix wrapped type tags", () => {
  const source = `
    const value = /**
                   * Narrows the runtime value to the documented type.
                   * @type {Array<
                   *   string
                   * >} */ (input)
  `
  const report = fixSource(source)

  assert.equal(report.fixed, false)
  assert.equal(report.output, source)
  assert.deepEqual(report.messages.map((message) => message.message), [ruleMessage])
})
