import {
	Fetcher,
	FetcherGetResourceParams,
	FetcherListFilesParams,
	FetcherListPackagesParams,
	FetcherListTagsParams,
	FetcherListTagsResult,
} from './fetcher.ts'

export class CachingFetcher {
	#fetcher: Fetcher
	#packages: Set<string> | null = null

	#tags = new Map<string, FetcherListTagsResult>()
	#files = new Map<string, string[]>()

	constructor(fetcher: Fetcher) {
		this.#fetcher = fetcher
	}

	async getResource(params: FetcherGetResourceParams): Promise<string> {
		return await this.#fetcher.getResource(params)
	}

	async listPackages(params: FetcherListPackagesParams): Promise<string[]> {
		if (this.#packages) return [...this.#packages]

		return await this.#forceListPackages(params)
	}

	async hasPackage(params: FetcherListPackagesParams, packageName: string): Promise<boolean> {
		const inner = async (doubleChecked = false): Promise<boolean> => {
			if (!this.#packages) {
				await this.#forceListPackages(params)
				return inner()
			}

			if (!this.#packages.has(packageName) && !doubleChecked) {
				await this.#forceListPackages(params)
				return await inner(true)
			}

			return this.#packages.has(packageName)
		}

		return await inner()
	}

	async listTags(params: FetcherListTagsParams): Promise<FetcherListTagsResult[]> {
		params.
	}

	async #forceListPackages(params: FetcherListPackagesParams): Promise<string[]> {
		this.#packages = new Set(await this.#fetcher.listPackages(params))

		return [...this.#packages]
	}

	async listFiles() {}
}
