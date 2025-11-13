This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

### Quick deploy steps (recommended)

1. Push your branch to a Git provider (GitHub/GitLab/Bitbucket):

```bash
git add .
git commit -m "chore: add vercel config and README deploy instructions"
git push origin master
```

2. Go to https://vercel.com/new and import your repository. Vercel will detect Next.js automatically.

3. Optional: set environment variables in the Vercel dashboard (Project → Settings → Environment Variables) if you want to override RPC endpoints or add API keys.

4. Deploy and open the generated <your-project>.vercel.app URL.

### Deploy with the Vercel CLI

If you prefer the CLI:

```bash
# install if needed
pnpm add -g vercel

# login
vercel login

# run from project root
vercel --prod
```

If you run into build issues on Vercel, paste the build logs here and I can help debug.
