import { BadParamsError, makeHandler, makeRoute } from './deps.ts'
import { Fetcher, ResourceData } from './fetcher.ts'
import { parsePath } from './parse_path.ts'

export type RegistryHandler = (request: Request) => Promise<Response>

export {
	BadParamsError,
	isBadParamsError,
	isForbiddenError,
	isNotAuthenticatedError,
	isNotFoundError,
	isUserError,
	NotAuthenticatedError,
	NotFoundError,
	UserError,
} from './deps.ts'

export * from './fetcher.ts'

// TODO connect these
const _registryJson = makeRoute('GET /.well-known/deno-import-intellisense.json', () => {
	return Response.json({
		version: 2,
		registries: [{
			schema: '/:package([a-z0-9_]*)@:version?/:path*',
			variables: [
				{
					key: 'package',
					url: '/_list_packages',
				},
				{
					key: 'version',
					url: '/_list_versions?package=${{package}}',
				},
				{
					key: 'path',
					url: '/_list_files?package=${{package}}&version=${{version}}',
				},
			],
		}],
	})
})

function getAuthToken(request: Request): string | null {
	// TODO support cookies for web portal

	const authorization = request.headers.get('Authorization')
	if (!authorization) return null

	if (!authorization.startsWith('Bearer ')) throw new BadParamsError('Only Bearer authorization is supported')
	return authorization.slice(7).trim()
}

function getContentType(path: string): string {
	if (path.endsWith('.ts')) return 'application/typescript'
	if (path.endsWith('.js')) return 'application/javascript'
	if (path.endsWith('.tsx')) return 'application/typescriptreact'
	if (path.endsWith('.jsx')) return 'application/javascriptreact'
	if (path.endsWith('.json')) return 'application/json'

	return 'application/octet-stream'
}

export function makeRegistryHandler(fetcher: Fetcher): RegistryHandler {
	return makeHandler([
		// TODO listing routes

		makeRoute('/*', async ({ request, url }) => {
			const authToken = getAuthToken(request)
			const { resource, location } = parsePath(url.pathname)
			const expectsHtml = /^text\/html/.test(request.headers.get('Accept') ?? '')

			// If no version was specified, redirect to this same route with the latest version specified
			if (!resource.version) {
				const versions = await fetcher.getVersions(resource.pkg, authToken)
				const defaultVersion = versions.find((version) => version.isDefault) || versions[0]
				if (!defaultVersion) throw new Error('No versions exist for this package')

				const headers = new Headers({ 'Location': `/${resource.pkg}@${defaultVersion.name}${resource.path}` })
				if (authToken) headers.append('Authorization', `Bearer ${authToken}`)

				return new Response(null, { status: 302, headers })
			}

			const versionedResource = resource as ResourceData

			if (expectsHtml) {
				const link = await fetcher.getResourceLink(versionedResource, location, authToken)

				return new Response(null, { status: 302, headers: { 'Location': link } })
			}

			const text = await fetcher.getResource(versionedResource, authToken)
			return new Response(text, { headers: { 'Content-Type': getContentType(resource.path) } })
		}),
	])
}
