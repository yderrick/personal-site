/**
 * Poem rendering.
 *
 * Markdown is the wrong tool for verse. Sätteri follows CommonMark, where a
 * single newline is a soft break that collapses — a poem run through
 * `<Content />` arrives as one run-on paragraph. Sätteri has no `breaks`
 * option to change that (its `Features` interface covers gfm, frontmatter,
 * math, headingAttributes, directive, superscript, subscript, wikilinks,
 * definitionList, smartPunctuation and rawHtml, and nothing else), and there
 * is no remark-breaks to reach for because this site does not use remark.
 *
 * So a poem's body is not parsed at all. It is escaped, given the one piece of
 * inline markup a poem actually wants, and emitted one line per element. Line
 * breaks, blank-line stanzas and leading indentation all survive exactly as
 * typed — which is also what makes the authorship ledger honest, since the
 * bytes that get hashed are the bytes a reader sees.
 *
 * One element per line rather than one `white-space: pre-wrap` block, because
 * a poem needs a hanging indent: when a line is too long for the column it
 * should wrap *inwards*, so a wrap is visually distinct from a line the author
 * actually broke. `text-indent` only affects the first formatted line of a
 * block, so a single pre-wrap block indents everything after line one instead —
 * which looks like the first line is outdented. Per-line elements give each
 * line its own first line to indent.
 *
 * Hand-rolled inline handling is the house pattern here; `excerpt()` in
 * src/lib/content.ts strips links, images and emphasis the same way.
 */

/**
 * Escape, then emphasise. The ordering is the security property: by the time
 * the emphasis pass runs, every `&`, `<` and `>` is already an entity, so the
 * only tags in the output are the `<em>` pairs added here. A poem containing
 * `<script>` renders as the text `<script>`.
 *
 * `*word*` and `_word_` only, bounded to one line and required to hug their
 * content, so an asterisk used as a dinkus or an underscore inside a word is
 * left alone.
 */
function inline(line: string): string {
	return line
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])/g, '<em>$1</em>')
		.replace(/(?<![\w_])_(?!\s)([^_\n]+?)(?<!\s)_(?![\w_])/g, '<em>$1</em>');
}

/** A poem's body as HTML: one `<span class="line">` per line of verse. */
export function renderVerse(body: string): string {
	return body
		// Strip blank leading lines and trailing whitespace, but not the leading
		// indentation of the first line — a poem is allowed to open indented, and
		// `.trim()` would quietly straighten it.
		.replace(/^(?:[ \t]*\n)+/, '')
		.replace(/\s+$/, '')
		.split('\n')
		.map((line) => `<span class="line">${inline(line)}</span>`)
		.join('');
}
