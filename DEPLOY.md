# Deploying PixelHaven to Netlify

## Prerequisites
- Node.js 18+ installed
- A free Netlify account (netlify.com)

## Step 1: Build the app
```bash
cd D:\pixelhaven
npm run build
```
This creates a `dist/` folder with the production build.

## Step 2: Deploy (Option A — Drag & Drop, easiest)
1. Go to https://app.netlify.com/drop
2. Drag the `dist/` folder onto the page
3. Netlify will deploy it instantly and give you a URL like `https://random-name.netlify.app`

## Step 3: Deploy (Option B — Netlify CLI)
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

## Step 4: Deploy (Option C — GitHub + Auto-Deploy)
1. Push your code to GitHub
2. Go to https://app.netlify.com → "Add new site" → "Import an existing project"
3. Connect your GitHub repo
4. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click "Deploy site"
6. Every push to `main` will auto-deploy

## Step 5: Custom domain (optional)
1. Go to Site settings → Domain management
2. Add your custom domain
3. Netlify provides free HTTPS automatically

## SPA Routing
This app uses hash-based routing (`/#/color/...`), so no special redirect rules are needed. All routes work out of the box.

## Environment Notes
- No server required — fully static site
- Audio files are served from `public/audio/` and included in the build
- Artwork manifests and previews are in `public/artwork/` and included in the build
"