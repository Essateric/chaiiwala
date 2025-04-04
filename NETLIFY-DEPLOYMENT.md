# Deploying Chaiiwala Dashboard to Netlify

This guide will walk you through deploying your Chaiiwala Dashboard to Netlify and setting up continuous deployment.

## Option 1: GitHub + Netlify (Recommended for Continuous Deployment)

This approach allows you to automatically deploy your site whenever you push changes to GitHub.

### Step 1: Push your Replit code to GitHub

1. Create a new repository on GitHub
2. Initialize Git in your Replit project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. Connect to your GitHub repository:
   ```bash
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

### Step 2: Connect Netlify to GitHub

1. Sign up/login to [Netlify](https://www.netlify.com/)
2. Click "New site from Git"
3. Select GitHub and authorize Netlify
4. Select your repository
5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist/client`
6. Click "Deploy site"

### Step 3: Configure Environment Variables

1. In Netlify, go to Site settings > Build & deploy > Environment
2. Add the following variables:
   - `SESSION_SECRET`: A secure random string
   - Any other environment variables your app needs

### Step 4: Enable Automatic Deploys

1. In Netlify, go to Site settings > Build & deploy > Continuous deployment
2. Ensure "Auto publish" is enabled

Now, whenever you push changes to GitHub, your site will automatically redeploy on Netlify.

## Option 2: Direct Deployment from Replit

If you prefer to deploy directly from Replit without using GitHub:

### Step 1: Authenticate with Netlify

Run the following command in your Replit shell:
```bash
npx netlify login
```

Follow the prompts to authenticate with Netlify.

### Step 2: Create a New Netlify Site

If you haven't created a site yet:
```bash
npx netlify sites:create --name your-site-name
```

### Step 3: Deploy Your Site

We've created a deployment script that makes this process easy:
```bash
node netlify-deploy.js
```

This will deploy to a draft URL for testing. To deploy to production:
```bash
node netlify-deploy.js --prod
```

## Notes on Manual Deployments

With the direct deployment approach, you'll need to manually run the deployment script each time you want to update your site. 

This is best for projects where:
- You don't need frequent updates
- You want to carefully control when your site updates
- You prefer not to use GitHub

For a fully automated workflow, Option 1 with GitHub integration is recommended.
