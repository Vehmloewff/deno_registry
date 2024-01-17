import { rooter } from './deps.ts'
import { Fetcher } from './fetcher.ts'
import { parsePath } from './parse_path.ts'

export type RegistryHandler = (request: Request) => Promise<Response>

const registryJson = rooter.makeRoute('GET /.well-known/deno-import-intellisense.json', () => {
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
	return request.headers.get('Authorization') ?? null
}

export function makeRegistryHandler(fetcher: Fetcher): RegistryHandler {
	return rooter.makeHandler([
		registryJson,

		// TODO listing endpoints

		rooter.makeRoute('*', ({ request, url }) => {
			const authToken = getAuthToken(request)
			const meta = parsePath(url.pathname)

			fetcher.getResource({})
		}),
	])
}
