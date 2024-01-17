import { utils } from './code-master/deps.ts'

const patternForErrors = '/<repo>[@<version>]/<filepath>[:<line>[:<col>]]'

export interface ParsedPath {
	repo: string
	version: string | null
	path: string
	line: number | null
	col: number | null
}

export function parsePath(path: string): ParsedPath {
	const [fullPath, lineStr, colStr] = path.split(':')
	const pathSections = fullPath.slice(1).split('/')
	const [repoAndVersion] = pathSections
	const filepath = `/${pathSections.slice(1).join('/')}`
	const [repo, version] = repoAndVersion.split('@')

	if (!repo) throw new utils.BadParamsError(`You must specify a repo.  Expected a path pattern of ${patternForErrors}`)
	if (!filepath) throw new utils.BadParamsError(`You must specify a filepath.  Expected a path pattern of ${patternForErrors}`)

	return {
		repo,
		version: version || null,
		path: filepath,
		line: parseToNum(lineStr),
		col: parseToNum(colStr),
	}
}

function parseToNum(content: string | undefined) {
	if (!content) return null

	const num = parseInt(content)
	if (isNaN(num)) throw new utils.BadParamsError(`Expected "${content}" to be a number`)

	return num
}
