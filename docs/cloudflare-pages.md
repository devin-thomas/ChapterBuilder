# Deploy ChapterBuilder to Cloudflare Pages

The web app is a static Vite PWA. It does not require Heroku, Workers, a database, or object storage.

## Pages project settings

Connect the `devin-thomas/ChapterBuilder` GitHub repository in **Workers & Pages** and use:

| Setting | Value |
| --- | --- |
| Production branch | `main` after the web branch is merged |
| Root directory | `web` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION=22.16.0` |

Pull requests receive Cloudflare preview deployments automatically after Git integration is enabled.

## Custom domain

After the first successful Pages deployment:

1. Open the Pages project.
2. Open **Custom domains**.
3. Select **Set up a domain**.
4. Enter `chapterbuilder.vidchopper.app`.
5. Confirm the DNS record Cloudflare proposes.

Because `vidchopper.app` is already managed in Cloudflare, Pages should add the required CNAME automatically after the domain is associated with the Pages project. Associate the domain in Pages first rather than manually creating only a DNS record.

## Recommended project name

Use `chapterbuilder` or `vidchopper-chapterbuilder`; the generated preview origin will be `<project>.pages.dev`, while the production interface remains `chapterbuilder.vidchopper.app`.
