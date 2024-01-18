import { NotAuthenticatedError, NotFoundError } from './deps.ts'
import { parseLinkHeader } from './paginate.ts'

export interface ResourceData {
	pkg: string
	path: string
	version: string
}

export interface ResourceDataUnsureVersion {
	pkg: string
	path: string
	version: string | null
}

export interface LocationData {
	line: number
	col: number
}

export interface ResourceVersion {
	name: string
	isDefault: boolean
}

export interface Fetcher {
	getResource(resource: ResourceData, authToken: string | null): Promise<string>
	getResourceLink(resource: ResourceData, location: LocationData | null, authToken: string | null): Promise<string>
	getVersions(pkg: string, authToken: string | null): Promise<ResourceVersion[]>
}

export class GithubFetcher implements Fetcher {
	#user: string

	constructor(user: string) {
		this.#user = user
	}

	async getResource(resource: ResourceData, authToken: string | null): Promise<string> {
		const githubPath = `https://raw.githubusercontent.com/${this.#user}/${resource.pkg}/${resource.version}/${resource.path}`
		const headers = new Headers()

		if (authToken) headers.append('Authorization', `token ${authToken}`)

		const githubRes = await fetch(githubPath, { headers })
		const text = await githubRes.text()

		if (githubRes.status === 404) throw new NotFoundError('Resource not found on github')
		if (githubRes.status === 401) throw new NotAuthenticatedError('You must specify a github token for authentication')

		if (!githubRes.ok) throw new Error(`Failed to get Github resource: ${text}`)

		return text
	}

	async getVersions(pkg: string, authToken: string | null): Promise<ResourceVersion[]> {
		const headers = new Headers({ 'Accept': 'application/vnd.github+json' })
		if (authToken) headers.append('Authorization', `Bearer ${authToken}`)

		const tagsResponse = await fetch(`https://api.github.com/repos/${this.#user}/${pkg}/tags`, { headers }).then((res) => res.json())
		const versions: ResourceVersion[] = []

		for (const tag of tagsResponse) versions.push({ name: tag.name, isDefault: !versions.length })

		return versions
	}

	getResourceLink(resource: ResourceData, location: LocationData | null): Promise<string> {
		let url = `https://github.com/${this.#user}/${resource.pkg}/blob/${resource.version}${resource.path}`
		if (location) url += `#L${location.line}`

		return Promise.resolve(url)
	}
}

interface GitlabProject {
	namespace: string
	id: string
}

export class GitlabFetcher implements Fetcher {
	#host: string
	#noAuthNamespace: string

	/**
	 * A fetcher for Gitlab. Looks for a project with a path that matches the requested package name, which requires a search.
	 *
	 * Thus, when a user navigates to the registry in their browser (without authentication), we don't know which namespace the project
	 * belongs in. This is why `noAuthNamespace` is an argument. If the user is not authenticated, fallback to a probable namespace */
	constructor(host: string, noAuthNamespace: string) {
		this.#host = host
		this.#noAuthNamespace = noAuthNamespace
	}

	async getResource(resource: ResourceData, authToken: string | null): Promise<string> {
		if (!authToken) throw new NotAuthenticatedError('Authentication is required to get a resource')

		const project = await this.#getProject(resource.pkg, authToken)
		const gitlabPath = resource.path.slice(1) // Path will start with a slash, but gitlab not like this
		const base = `https://${this.#host}/api/v4/projects/${project.id}/repository/files`
		const url = `${base}/${encodeURIComponent(gitlabPath)}?ref=${resource.version}`

		const headers = new Headers({ 'PRIVATE-TOKEN': authToken })
		const res = await fetch(url, { headers })

		if (res.status === 404) throw new NotFoundError('Resource not found on Gitlab')
		if (res.status === 401) throw new NotAuthenticatedError('You must specify a Gitlab token for authentication')

		if (!res.ok) throw new Error(`Failed to get Gitlab resource: ${await res.text()}`)

		const json = await res.json()
		return atob(json.content)
	}

	async #getProject(pkg: string, authToken: string, link?: string): Promise<GitlabProject> {
		const headers = new Headers()
		if (authToken) headers.append('PRIVATE-TOKEN', authToken)

		const res = await fetch(link || `https://${this.#host}/api/v4/projects?simple=true&search=${pkg}`, { headers })
		if (!res.ok) throw new Error(`Failed to list gitlab projects: ${await res.text()}`)

		const projects = await res.json()

		// deno-lint-ignore no-explicit-any
		const project = projects.find((project: any) => project.path === pkg)

		if (!project) {
			const linkHeader = res.headers.get('Link')
			if (!linkHeader) throw new Error('Expected to find a Link header in gitlab response')

			const links = parseLinkHeader(linkHeader)
			const nextLink = links.get('next')
			if (!nextLink) throw new NotFoundError(`No Gitlab project could be found for '${pkg}'`)

			return this.#getProject(pkg, authToken, nextLink)
		}

		return { id: project.id, namespace: project.namespace.path }
	}

	async getVersions(pkg: string, authToken: string | null): Promise<ResourceVersion[]> {
		if (!authToken) throw new NotAuthenticatedError('Authentication is required to list project versions')

		const headers = new Headers({ 'PRIVATE-TOKEN': authToken })
		const project = await this.#getProject(pkg, authToken)

		const url = `https://${this.#host}/api/v4/projects/${project.id}/repository/tags`
		const tagsResponse = await fetch(url, { headers }).then((res) => res.json())
		const versions: ResourceVersion[] = []

		for (const tag of tagsResponse) versions.push({ name: tag.name, isDefault: !versions.length })

		return versions
	}

	async getResourceLink(resource: ResourceData, location: LocationData | null, authToken: string | null): Promise<string> {
		const namespace = authToken ? await this.#getProject(resource.pkg, authToken).then((res) => res.namespace) : this.#noAuthNamespace

		let url = `https://${this.#host}/${namespace}/${resource.pkg}/-/blob/${resource.version}${resource.path}`
		if (location) url += `#L${location.line}`

		return Promise.resolve(url)
	}
}
