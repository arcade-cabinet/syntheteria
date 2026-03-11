Run linting and full test suite. Fix any issues found.

```bash
npx biome check ./src --no-errors-on-unmatched 2>&1 | tail -20
npx tsc --noEmit 2>&1 | tail -20
npx jest --no-cache 2>&1 | tail -20
```

If any step fails, fix the issues and re-run until all pass.
