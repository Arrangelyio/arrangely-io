# Cloudflare Worker for TUS Upload Proxy

This worker enables large video uploads (up to 5GB) by proxying TUS protocol requests from the client to Cloudflare Stream with proper CORS headers.

## Why This Worker Exists

- Cloudflare Stream's Direct Upload API has a 200-500MB limit
- TUS protocol supports resumable uploads for files up to 5GB
- TUS endpoints require server-side proxy for CORS support
- Supabase Edge Functions cannot handle large request bodies
- This worker acts as a lightweight proxy without memory constraints

## Deployment Steps

1. **Create a new Cloudflare Worker:**
   - Go to Cloudflare Dashboard → Workers & Pages
   - Click "Create Application" → "Create Worker"
   - Name it: `arrangely-tus-upload-proxy`

2. **Deploy the code:**
   - Copy the contents of `tus-upload-proxy.js`
   - Paste into the worker editor
   - Click "Save and Deploy"

3. **Configure environment variables:**
   - Go to Worker Settings → Variables
   - Add the following secrets:
     - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
     - `CLOUDFLARE_STREAM_API_TOKEN`: Your Cloudflare Stream API token
   
4. **Get the worker URL:**
   - After deployment, you'll get a URL like: `https://arrangely-tus-upload-proxy.YOUR_SUBDOMAIN.workers.dev`
   - Copy this URL

5. **Update the application:**
   - Add a new secret in Supabase: `CLOUDFLARE_TUS_PROXY_URL`
   - Set it to your worker URL from step 4

## How It Works

1. Client initiates upload by calling Supabase Edge Function
2. Edge Function creates TUS session in Cloudflare Stream
3. Edge Function returns video ID to client
4. Client uses tus-js-client to upload to this worker URL
5. Worker proxies TUS requests to Cloudflare Stream with proper authentication
6. Upload progresses in chunks (50MB each) with resume capability

## Testing

After deployment, test with:
```bash
curl -X OPTIONS https://YOUR-WORKER-URL.workers.dev \
  -H "Origin: http://localhost:8082" \
  -H "Access-Control-Request-Method: POST"
```

You should see CORS headers in the response.
