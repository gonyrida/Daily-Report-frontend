# Render Deployment Guide

## Environment Variables

Set the following environment variables in your Render dashboard:

### Required Variables

1. **VITE_API_BASE_URL**
   - Your backend API URL
   - Example: `https://your-backend.onrender.com/api`
   - **Important**: Do NOT include a trailing slash

### Optional Variables (if using Supabase)

2. **VITE_SUPABASE_URL**
   - Your Supabase project URL

3. **VITE_SUPABASE_PUBLISHABLE_KEY**
   - Your Supabase anon/public key

## Build Settings in Render

- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18.x or higher

## Setting Environment Variables in Render

1. Go to your service dashboard in Render
2. Navigate to "Environment" tab
3. Add the environment variables listed above
4. Redeploy your service

## Troubleshooting

If the build fails:
1. Check that all environment variables are set correctly
2. Ensure `VITE_API_BASE_URL` does NOT have a trailing slash
3. Check the build logs for specific error messages
4. Verify Node.js version is 18.x or higher

