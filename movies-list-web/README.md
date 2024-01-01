# movies-list-web

The browser client for Movies List: Create React App, TypeScript, Tailwind, Formik and
React Router. Setup, architecture and screenshots are in the [root README](../README.md).

```bash
npm ci
cp .env.example .env     # REACT_APP_SERVER_URL, inlined at build time
npm start                # dev server on :3000
npm test -- --watchAll=false
npm run lint
npm run build            # static bundle in build/, served by nginx in the Docker image
```

`src/contracts/api.ts` is generated from `../shared/contracts/api.ts`; edit the shared file
and run `npm run contract:sync` from the repository root.
