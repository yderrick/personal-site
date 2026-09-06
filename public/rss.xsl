<?xml version="1.0" encoding="utf-8"?>
<!--
  Browser styling for /rss.xml.

  A feed URL gets opened in a browser far more often than it gets pasted into a
  reader, and an unstyled one shows a wall of markup that reads as a broken
  page. This turns that into something explaining what the file is and how to
  use it, while leaving the XML underneath untouched for actual readers.

  Colours are duplicated from src/styles/tokens.css rather than imported: this
  file is transformed by the browser's XSLT engine before any stylesheet loads,
  so it cannot reach the site's custom properties. It is the one deliberate
  exception to the single-source-of-truth rule for tokens.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	<xsl:output method="html" version="1.0" encoding="utf-8" indent="yes" />

	<xsl:template match="/">
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title><xsl:value-of select="/rss/channel/title" /></title>
				<style>
					:root { color-scheme: dark; }
					body {
						margin: 0;
						padding: 3rem 1.5rem 5rem;
						background: #14110c;
						color: #efe7d9;
						font-family: ui-sans-serif, system-ui, sans-serif;
						line-height: 1.6;
					}
					.wrap { max-width: 46rem; margin-inline: auto; }
					h1 {
						font-size: 1.75rem;
						margin: 0 0 .5rem;
						font-weight: 600;
					}
					h1 .mark { color: #ffb000; }
					.lede { color: #91856f; margin: 0 0 2rem; max-width: 40rem; }
					.note {
						border: 1px solid #322b20;
						border-radius: .5rem;
						background: #1c1811;
						padding: 1rem 1.25rem;
						margin-bottom: 2.5rem;
						font-size: .9375rem;
					}
					.note code {
						font-family: ui-monospace, SFMono-Regular, monospace;
						color: #ffb000;
						word-break: break-all;
					}
					a { color: #ffb000; }
					a:hover { color: #efe7d9; }
					ul { list-style: none; margin: 0; padding: 0; }
					li {
						padding-block: 1.25rem;
						border-top: 1px solid #322b20;
					}
					li h2 { font-size: 1.0625rem; margin: 0 0 .25rem; font-weight: 600; }
					li h2 a { text-decoration: none; }
					li h2 a:hover { text-decoration: underline; }
					.meta {
						font-family: ui-monospace, SFMono-Regular, monospace;
						font-size: .75rem;
						letter-spacing: .04em;
						color: #91856f;
						margin: 0 0 .5rem;
					}
					.desc { margin: 0; color: #91856f; }
				</style>
			</head>
			<body>
				<div class="wrap">
					<h1>
						<span class="mark">&#8250;&#8250;</span>
						<xsl:text> </xsl:text>
						<xsl:value-of select="/rss/channel/title" />
					</h1>
					<p class="lede"><xsl:value-of select="/rss/channel/description" /></p>

					<div class="note">
						<p style="margin:0 0 .5rem">
							This is an RSS feed. Paste its address into a feed reader to get new
							entries as they are written.
						</p>
						<p style="margin:0">
							<code><xsl:value-of select="/rss/channel/link" />rss.xml</code>
						</p>
						<p style="margin:.75rem 0 0">
							<a href="{/rss/channel/link}">&#8592; Back to the site</a>
						</p>
					</div>

					<ul>
						<xsl:for-each select="/rss/channel/item">
							<li>
								<!-- RFC-822 dates are "Sun, 06 Sep 2026 00:00:00 GMT". Entries are
								     dated to the day, so the time is noise; cut to "06 Sep 2026". -->
								<p class="meta"><xsl:value-of select="substring(pubDate, 6, 11)" /></p>
								<h2>
									<a href="{link}"><xsl:value-of select="title" /></a>
								</h2>
								<p class="desc"><xsl:value-of select="description" /></p>
							</li>
						</xsl:for-each>
					</ul>
				</div>
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
