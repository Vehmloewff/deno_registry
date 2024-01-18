import { LocationData, ResourceDataUnsureVersion } from './fetcher.ts'
import { BadParamsError } from './deps.ts'

const patternForErrors = '/<repo>[@<version>]/<filepath>[:<line>[:<col>]]'

export interface ParsedPath {
	resource: ResourceDataUnsureVersion
	location: LocationData | null
}

export function parsePath(path: string): ParsedPath {
	const [fullPath, lineStr, colStr] = path.split(':')
	const pathSections = fullPath.slice(1).split('/')
	const [repoAndVersion] = pathSections
	const filepath = `/${pathSections.slice(1).join('/')}`
	const [pkg, version] = repoAndVersion.split('@')

	if (!pkg) throw new BadParamsError(`You must specify a repo.  Expected a path pattern of ${patternForErrors}`)
	if (filepath === '/') throw new BadParamsError(`You must specify a filepath.  Expected a path pattern of ${patternForErrors}`)

	const line = parseToNum(lineStr)
	const col = parseToNum(colStr)

	return {
		resource: {
			pkg,
			version: version || null,
			path: filepath,
		},
		location: line === null ? null : { line, col: col ?? 0 },
	}
}

function parseToNum(content: string | undefined) {
	if (!content) return null

	const num = parseInt(content)
	if (isNaN(num)) throw new BadParamsError(`Expected "${content}" to be a number`)

	return num
}
