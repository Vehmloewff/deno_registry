# deno_registry

A simple Deno registry that serves modules via a modular `Fetcher` (Github and Gitlab fetchers are provided)

## Usage

```typescript
import { makeRegistryHandler, GithubFetcher } from 'https://denopkg.com/Vehmloewff/registry@1.0.0/mod.ts'

Deno.serve(makeRegistryHandler(new GithubFetcher('Vehmloewff')))
```

```shell
deno cache http://localhost:8000/deno_registry/mod.ts
```
