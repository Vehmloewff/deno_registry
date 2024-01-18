import { assertEquals, assertThrows } from 'assert'
import { parsePath } from './parse_path.ts'

Deno.test('should parse a loaded path', () => {
	assertEquals(parsePath('/auth@1.2.3/path/to/file.ts:45:23'), {
		resource: {
			pkg: 'auth',
			version: '1.2.3',
			path: '/path/to/file.ts',
		},
		location: {
			line: 45,
			col: 23,
		},
	})
})

Deno.test('should parse an unloaded path', () => {
	assertEquals(parsePath('/auth/path/to/file.ts'), {
		resource: {
			pkg: 'auth',
			version: null,
			path: '/path/to/file.ts',
		},
		location: null,
	})
})

Deno.test('should not parse with no path', () => {
	assertThrows(() => parsePath('/auth_no_filepath'))
})

Deno.test('should not parse no pkg', () => {
	assertThrows(() => parsePath('/'))
})
