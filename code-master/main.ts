import { http, media, pathUtils, utils } from './deps.ts'
import { parsePath } from '../parse_path.ts'

const GH_TOKEN = Deno.env.get('GH_TOKEN')
if (!GH_TOKEN) throw new Error('Expected env var GH_TOKEN to be supplied')

const GH_USERNAME = Deno.env.get('GH_USERNAME')
if (!GH_USERNAME) throw new Error('Expected env var GH_USERNAME to be supplied')

const responseHeaders = { 'Access-Control-Allow-Origin': '*' }

async function handler(request: Request): Promise<Response> {
	const path = parsePath(new URL(request.url).pathname)

	if (!path.version) return await redirectToDefaultBranch(path.repo, path.filepath)

	return await serveFile(request, path.repo, path.version, path.filepath)
}

async function serveFile(request: Request, repo: string, blob: string, file: string): Promise<Response> {
	const accept = request.headers.get('Accept')

	const githubPath = `https://raw.githubusercontent.com/jikno/${repo}/${blob}/${file}`
	const extension = pathUtils.extname(file)
	const mediaType =
		// Return text/plain to browsers for .ts files
		accept && extension === '.ts' && /^text\/html/.test(accept)
			? 'text/plain'
			// But the standard content type to everyone else
			: media.contentType(extension) || 'application/octet-stream'

	const githubRes = await fetch(githubPath, {
		headers: { Authorization: `token ${GH_TOKEN}` },
	})

	return new Response(githubRes.body, {
		headers: { 'Content-Type': mediaType, ...responseHeaders },
		status: githubRes.status,
	})
}

async function redirectToDefaultBranch(repo: string, file: string): Promise<Response> {
	const repoData = await fetch(`https://api.github.com/repos/jikno/${repo}`, {
		headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/json' },
	}).then(async (res) => {
		if (!res.ok) {
			if (res.status === 404) return null

			throw new Error(`Bad response (${res.status}) from github api: ${await res.text()}`)
		}

		return await res.json()
	})

	if (!repoData) return new Response('Repository does not exist', { status: 404, headers: responseHeaders })

	const defaultBranch = repoData.default_branch
	if (!defaultBranch) return new Response("Repo doesn't have a default branch", { status: 404, headers: responseHeaders })

	const newUrl = `/${repo}@${defaultBranch}${file}`

	return new Response('Redirect to default branch', {
		status: 302,
		headers: { Location: newUrl, ...responseHeaders },
	})
}

http.serve(handler, {
	port: 8000,
	onError: utils.errorToResponse,
	onListen({ port }) {
		console.log(`Listening at http://localhost:${port}`)
	},
})
