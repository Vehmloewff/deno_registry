export function parseLinkHeader(link: string): Map<string, string> {
	const verbs = new Map<string, string>()

	for (const linkItem of link.split(',')) {
		const [rawLink, rel] = linkItem.split(';').map((text) => text.trim())

		if (!rawLink.startsWith('<') && !rawLink.endsWith('>')) throw new Error('Expected link to be enclosed in brackets')
		if (!rel.startsWith('rel=')) throw new Error('Expected link to have a "rel" part')

		const link = rawLink.slice(1, -1)
		const verb = removeQuotes(rel.slice(4))

		verbs.set(verb, link)
	}

	return verbs
}

function removeQuotes(text: string) {
	if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1)
	if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1)

	return text
}
