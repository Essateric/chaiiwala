# Chaiiwala Dashboard

A comprehensive management dashboard for Chaiiwala stores, designed to streamline business operations.

## Features
- Inventory management with real-time tracking
- Staff scheduling and performance monitoring
- Task management and reporting
- Multi-store inventory synchronization
- Role-based access control
- Deep cleaning management

## Deploying to Netlify

To deploy this application to Netlify and maintain continuous deployment from Replit:

### Option 1: Setup via GitHub

1. **Push your Replit code to GitHub**:
   - Create a new repository on GitHub
   - In your Replit shell, run:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin YOUR_GITHUB_REPO_URL
     git push -u origin main
     ```

2. **Connect your GitHub Repository to Netlify**:
   - Log in to [Netlify](https://www.netlify.com/)
   - Click "New site from Git"
   - Select GitHub and authorize Netlify
   - Select your repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `dist/client`
   - Click "Deploy site"

3. **Set up environment variables**:
   - Go to Site settings > Build & deploy > Environment
   - Add the following variables:
     - `SESSION_SECRET`: A secure random string
     - Any other secrets your application needs

4. **Enable automatic deploys**:
   - In Netlify, go to Site settings > Build & deploy > Continuous deployment
   - Ensure "Auto publish" is enabled

Now, whenever you push changes to your GitHub repository, Netlify will automatically rebuild and deploy your site.

### Option 2: Direct Deploy from Replit

You can also use the Netlify CLI to deploy directly from Replit:

1. Install the Netlify CLI as a dev dependency
2. Authenticate with Netlify through the CLI
3. Deploy your built site to Netlify

This method requires manual deployment each time you want to update your site.

## Authentication

The system uses role-based access control:
- Admin: Full access to all features and stores
- Regional Manager: Access to all stores in their region
- Store Manager: Access limited to their assigned store
- Staff: Limited access to specific features within their store

Default test credentials:
- Admin: username `shabnam`, password `password123`
- Regional: username `usman`, password `password123`
- Store Manager: username `jubayed`, password `password123`
