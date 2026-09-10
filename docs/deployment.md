# Azure deployment contract

ADP publishes a browser-only static build from the public [GitHub repository](https://github.com/aserdargun/adp-aserdargun-com).

| Setting             | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| Production endpoint | https://polite-water-0a760bd03.3.azurestaticapps.net  |
| Custom domain       | https://adp.aserdargun.com                            |
| Branch              | `main`                                                |
| Subscription        | `aserdargun subscription 3`                           |
| Resource group      | `rg-adp-aserdargun-com`                               |
| Static Web App      | `swa-adp-aserdargun-com`                              |
| Region / SKU        | West Europe / Free                                    |
| Build artifact      | `dist/`                                               |
| Workflow            | `.github/workflows/deploy-swa-adp-aserdargun-com.yml` |

The workflow installs the lockfile dependencies, checks formatting, runs TypeScript and all unit tests, builds the static artifact and validates its release manifest. Pinned official GitHub and Azure actions deploy the prebuilt files. The deployment token is stored only in the repository's Actions secret; it is never embedded in the app. Production runs are serialized without cancellation.

`dist/release.json` records the source commit and SHA-256 hashes of the JavaScript and CSS entry assets, plus every delivered file (HTML, fonts, security policy and model specification). Local builds also report whether the checkout has uncommitted changes. Artifact verification rejects missing or modified files. A completed release requires a successful workflow for the intended commit, a Ready production environment on `main`, a matching live manifest and asset hashes, working HTTPS and routing, and desktop/mobile interaction checks. Provisioning a resource alone is not release evidence.

Local verification:

```sh
npm run validate
npm run format:check
npm run verify:artifact
```

The application has no runtime API, database or server-side secrets. No custom domain or DNS records are created by this workflow. The existing custom domain `adp.aserdargun.com` serves the same app as the generated hostname. Verify both hosts after publication; domain configuration remains outside this workflow.
