// @ts-check

const typeTagPattern = /^@type\b/

/**
 * Checks whether the `@type` tag fits on one line.
 * @param {string} typeTag - Type tag text.
 * @returns {boolean} Whether the tag text contains the complete type braces.
 */
function isSingleLineTypeTag(typeTag) {
  return /\{.*\}/.test(typeTag)
}

/**
 * ESLint comment shape used by this rule.
 * @typedef {object} SourceComment
 * @property {"Block" | "Line"} type - Comment type.
 * @property {string} value - Comment body without delimiters.
 * @property {[number, number]} range - Comment source range.
 * @property {{start: {line: number, column: number}, end: {line: number, column: number}}} loc - Comment location.
 */

/**
 * Removes the leading JSDoc asterisk from a comment line.
 * @param {string} line - Raw comment value line.
 * @returns {string} Comment line without the leading asterisk.
 */
function lineAfterJSDocPrefix(line) {
  return line.replace(/^\s*\*/, "").trim()
}

/**
 * Inline JSDoc type comment details.
 * @typedef {object} InlineTypeComment
 * @property {string[]} descriptionLines - Non-type JSDoc lines to preserve.
 * @property {string} typeTag - Inline type tag text.
 */

/**
 * Finds the inline `@type` tag and description text from a JSDoc comment.
 * @param {SourceComment} comment - JSDoc comment.
 * @returns {InlineTypeComment | undefined} Inline type comment details.
 */
function inlineTypeComment(comment) {
  /** @type {string[]} */
  const descriptionLines = []
  let typeTag

  for (const line of comment.value.split("\n")) {
    const text = lineAfterJSDocPrefix(line)

    if (!text) continue
    if (typeTagPattern.test(text)) {
      typeTag = text
    } else {
      descriptionLines.push(text)
    }
  }

  if (!typeTag) return

  return {descriptionLines, typeTag}
}

/**
 * @param {import("eslint").SourceCode} sourceCode - ESLint source code object.
 * @param {SourceComment} comment - Comment node.
 * @returns {boolean} Whether the comment is embedded in an expression or parameter list.
 */
function isInlineTypeComment(sourceCode, comment) {
  const previousToken = sourceCode.getTokenBefore(comment, {includeComments: false})
  const nextToken = sourceCode.getTokenAfter(comment, {includeComments: false})

  return Boolean(
    (previousToken && previousToken.loc.end.line === comment.loc.start.line) ||
      (nextToken && nextToken.loc.start.line === comment.loc.end.line) ||
      (previousToken?.type === "Punctuator" && previousToken.value === "(") ||
      (nextToken?.type === "Punctuator" && nextToken.value === "(")
  )
}

/**
 * Builds line comments that preserve descriptive JSDoc text before the fixed cast.
 * @param {import("eslint").SourceCode} sourceCode - ESLint source code object.
 * @param {SourceComment} comment - Comment node.
 * @param {string[]} descriptionLines - Description lines to preserve.
 * @returns {string} Line comments for the description.
 */
function descriptionCommentText(sourceCode, comment, descriptionLines) {
  if (descriptionLines.length === 0) return ""

  const line = sourceCode.lines[comment.loc.start.line - 1] || ""
  const indentation = line.match(/^\s*/)?.[0] || ""
  const comments = descriptionLines.map((descriptionLine) => `${indentation}// ${descriptionLine}`)

  return `${comments.join("\n")}\n`
}

/**
 * Builds the fixer for an inline type comment.
 * @param {import("eslint").SourceCode} sourceCode - ESLint source code object.
 * @param {SourceComment} comment - Comment node.
 * @param {InlineTypeComment} inlineComment - Inline type comment details.
 * @returns {((fixer: import("eslint").Rule.RuleFixer) => import("eslint").Rule.Fix[]) | undefined} ESLint fix callback.
 */
function inlineTypeCastFix(sourceCode, comment, inlineComment) {
  if (!isSingleLineTypeTag(inlineComment.typeTag)) return

  return (fixer) => {
    const lineStartIndex = sourceCode.getIndexFromLoc({line: comment.loc.start.line, column: 0})
    const preservedDescription = descriptionCommentText(sourceCode, comment, inlineComment.descriptionLines)

    if (!preservedDescription) {
      return [fixer.replaceTextRange(comment.range, `/** ${inlineComment.typeTag} */`)]
    }

    if (lineStartIndex === comment.range[0]) {
      return [fixer.replaceTextRange(comment.range, `${preservedDescription}/** ${inlineComment.typeTag} */`)]
    }

    return [
      fixer.replaceTextRange([lineStartIndex, lineStartIndex], preservedDescription),
      fixer.replaceTextRange(comment.range, `/** ${inlineComment.typeTag} */`)
    ]
  }
}

/**
 * @param {import("eslint").Rule.RuleContext} context - ESLint rule context.
 * @param {import("eslint").SourceCode} sourceCode - ESLint source code object.
 * @param {SourceComment} comment - Comment node.
 * @param {InlineTypeComment} inlineComment - Inline type comment details.
 * @returns {void}
 */
function reportInlineTypeCast(context, sourceCode, comment, inlineComment) {
  context.report({
    loc: comment.loc,
    messageId: "multilineInlineTypeCast",
    fix: inlineTypeCastFix(sourceCode, comment, inlineComment)
  })
}

/** @type {import("eslint").Rule.RuleModule} */
const jsdocInlineTypeCastsRule = {
  meta: {
    type: "layout",
    docs: {
      description: "Require inline JSDoc type casts to stay on one line."
    },
    fixable: "code",
    schema: [],
    messages: {
      multilineInlineTypeCast: "Inline JSDoc @type comments must stay on one line; move complex casts to a named local."
    }
  },

  /**
   * @param {import("eslint").Rule.RuleContext} context - ESLint rule context.
   * @returns {import("eslint").Rule.RuleListener} Rule listener.
   */
  create(context) {
    const sourceCode = context.sourceCode

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type !== "Block") continue
          if (!comment.value.startsWith("*")) continue
          if (!comment.loc || !comment.range) continue

          const sourceComment = /** @type {SourceComment} */ (comment)

          if (sourceComment.loc.start.line === sourceComment.loc.end.line) continue
          if (!isInlineTypeComment(sourceCode, sourceComment)) continue

          const inlineComment = inlineTypeComment(sourceComment)

          if (!inlineComment) continue

          reportInlineTypeCast(context, sourceCode, sourceComment, inlineComment)
        }
      }
    }
  }
}

export default jsdocInlineTypeCastsRule
