export interface FetcherGetResourceParams {
	repo: string
	path: string
	tag: string | null
	authorization: string | null
}

export interface FetcherListFilesParams {
	repo: string
	tag: string | null
	authorization: string | null
}

export interface FetcherListTagsParams {
	repo: string
	authorization: string | null
}

export interface FetcherListTagsResult {
	defaultTag: string
	tags: string[]
}

export interface FetcherListPackagesParams {
	authorization: string | null
}

export interface Fetcher {
	getResource(params: GetResourceParams): Promise<string>
	getResourceLink(params: GetResourceLinkParams): Promise<string>
	listFiles(params: FetcherListFilesParams): Promise<string[]>
	listVersions(params: FetcherListTagsParams): Promise<FetcherListTagsParams>
	listPackages(params: FetcherListPackagesParams): Promise<string[]>
}
