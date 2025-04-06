# Netlify Deployment Guide for Chaiiwala Dashboard

This guide outlines the steps to deploy the Chaiiwala Dashboard to Netlify, ensuring that both the frontend and backend components work correctly.

## Content Security Policy (CSP)

The dashboard uses a carefully configured Content Security Policy to ensure security while allowing necessary functionality:

- The CSP is configured in two places:
  1. In `netlify.toml` under the `[[headers]]` section
  2. In `netlify/_headers` file which is copied to the build output
  3. In `client/index.html` as a meta tag for local development

- The policy specifically allows:
  - `unsafe-eval` in script-src to allow React and other dependencies to function correctly
  - Connections to Netlify domains for serverless functions 
  - Font loading from Google Fonts
  - Data URIs for images

If you experience any CSP-related issues (visible as "Content Security Policy blocks the use of 'eval' in JavaScript" in browser console), check that these files are consistent.
