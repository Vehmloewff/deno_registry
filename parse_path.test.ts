import { assertEquals } from 'assert'
import { parsePath } from './parse_path.ts'

Deno.test({
	name: 'should parse a loaded path',
	fn() {
		assertEquals(parsePath('/auth@1.2.3/path/to/file.ts:45:23'), {
			repo: 'auth',
			version: '1.2.3',
			path: '/path/to/file.ts',
			line: 45,
			col: 23,
		})
	},
})

Deno.test({
	name: 'should parse an unloaded path',
	fn() {
		assertEquals(parsePath('/auth/path/to/file.ts'), {
			repo: 'auth',
			version: null,
			path: '/path/to/file.ts',
			line: null,
			col: null,
		})
	},
})
