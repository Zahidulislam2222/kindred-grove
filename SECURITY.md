# Security reporting

Updated: 2026-10-08. The maintained technical security register is [docs/SECURITY.md](docs/SECURITY.md). It describes the theme's trust boundaries, scan evidence, known gaps and future operating controls.

Please report suspected security issues privately to the repository maintainer. If GitHub offers **Report a vulnerability** in this repository's Security tab, use that private route. Otherwise arrange a private channel with the maintainer before sharing reproduction details. Do not publish passwords, tokens, customer data or exploit instructions in a public issue. No dedicated response SLA or bounty program is currently established.

Include the affected source revision, component, redacted reproduction, expected/observed behavior and impact. The maintainer should acknowledge, classify, reproduce safely, contain, patch, review, verify and coordinate disclosure. Avoid testing against other shoppers, placing orders or generating public load.

The current reviewed source is maintained on the active release branch pending required approval into `main`. Earlier revisions and the isolated historical checkout extension are not represented as supported production deployments. Verify the actual branch/head and [release status](docs/RELEASE.md) before relying on a fix.
