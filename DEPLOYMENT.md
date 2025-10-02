# LibreChat Railway Deployment Guide

This guide walks you through deploying LibreChat to Railway with the RAG API.

## Prerequisites

- Completed [local setup](./README.md) including MongoDB Atlas configuration
- Railway account
- Your configured `.env.<app_name>` file from local setup

---

## Part 1: Deploy LibreChat Client Service

### 1. Create a New Railway Project

1. Log in to [Railway](https://railway.app/)
2. Click "New Project"
3. Select "Empty Project"
4. Name your project (e.g., "LibreChat Production")

### 2. Create the Client Service

1. Click "+ New" in your Railway project
2. Select "Empty Service"
3. Name the service (e.g., "librechat-client")

### 3. Configure Source Repository

1. In the service settings, go to "Source"
2. Click "Connect Repo"
3. Select your repository: `Actual-Reality/LibreChat`
4. Set the **Branch** to your project branch (e.g., `<app_name>`)
5. Click "Connect"

### 4. Generate Public Domain

1. Go to the "Settings" tab
2. Scroll down to "Networking"
3. Click "Generate Domain" under "Public Networking"
4. Copy the generated domain (e.g., `librechat-production.up.railway.app`)
5. Save this domain - you'll need it for environment variables

### 5. Set Custom Start Command

1. Still in "Settings", scroll to "Deploy"
2. Under "Custom Start Command", enter:
   ```
   npm run backend
   ```
3. Click "Update"

### 6. Configure Environment Variables

1. Go to the "Variables" tab
2. Click "Raw Editor"
3. Copy the contents of your `.env.<app_name>` file
4. Paste into the Raw Editor
5. **Clean up the file:**
   - Remove all empty lines
   - Remove all comments (lines starting with `#`)
   - Remove any variables that are empty or not needed

6. **Update the following variables:**

```bash
HOST=0.0.0.0
DOMAIN_CLIENT=https://<your-generated-domain>
DOMAIN_SERVER=https://<your-generated-domain>
NODE_ENV=production
MONGO_URI=mongodb+srv://app_user_prod:<password>@<cluster>.mongodb.net/production?retryWrites=true&w=majority
ATLAS_MONGO_DB_URI=mongodb+srv://app_user_prod:<password>@<cluster>.mongodb.net/production?retryWrites=true&w=majority
RAG_API_URL=http://librechat-rag-api-dev:8000
```

Replace:
- `<your-generated-domain>` with the domain you generated in step 4
- `<password>` with your `app_user_prod` password from MongoDB Atlas setup
- `<cluster>` with your MongoDB cluster name
- Note: Both `MONGO_URI` and `ATLAS_MONGO_DB_URI` should use the **production** database, not **test**

7. Click "Update Variables"

> **Important**: Do not deploy yet! We need to set up the RAG API service first.

---

## Part 2: Deploy RAG API Service

### 1. Create the RAG API Service

1. In the same Railway project, click "+ New"
2. Select "Empty Service"
3. Name the service `librechat-rag-api-dev` (exact name is important for private networking)

### 2. Configure Docker Image

1. Go to the service settings
2. Under "Source", select "Docker Image"
3. Enter the image:
   ```
   ghcr.io/danny-avila/librechat-rag-api-dev:latest
   ```
4. Click "Deploy"

### 3. Configure RAG API Environment Variables

1. Go to the "Variables" tab
2. Click "Raw Editor"
3. Paste the following configuration:

```bash
EMBEDDINGS_PROVIDER=openai
OPENAI_API_KEY=<your-openai-api-key>
VECTOR_DB_TYPE=atlas-mongo
RAG_PORT=8000
ATLAS_MONGO_DB_URI=mongodb+srv://app_user_prod:<password>@<cluster>.mongodb.net/production?retryWrites=true&w=majority
ATLAS_SEARCH_INDEX=vector_index
CHUNK_OVERLAP=200
CHUNK_SIZE=600
COLLECTION_NAME=rag_vectors
EMBEDDINGS_MODEL=text-embedding-3-small
RAG_HOST=::
```

Replace:
- `<your-openai-api-key>` with the same OpenAI API key from your client service
- `<password>` with your `app_user_prod` password
- `<cluster>` with your MongoDB cluster name
- `ATLAS_MONGO_DB_URI` should be identical to the one in your client service

4. Click "Update Variables"

### 4. Verify Service Name

The RAG API service **must** be named `librechat-rag-api-dev` to match the `RAG_API_URL` in your client service. 

To verify:
1. Click on the service settings
2. Check the service name at the top
3. If it's different, rename it to `librechat-rag-api-dev`

---

## Part 3: Deploy Railway S3 Bucket

### Enable Feature Flag

As of 10/2/2026 Railways "Buckets" feature is behind a feature flag.
This is enabled for the Actual Reality Technologies Workspace.
To enable/disable this feature navigate to Workspace Settings -> Feature Flags -> Buckets

### Configure environment

Right click in the project canvas, click "Bucket" and deploy. Once deployed the Credentials tab will be populated. You'll need five variables:

```shell
AWS_BUCKET_NAME=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_ENDPOINT_URL="https://b1.us-east-1.storage.railway.app"
AWS_REGION="us-east-1"
```

_NOTE that `AWS_ENDPOINT_URL` and `AWS_REGION` are static_

Add these the the client.

### Configure client

In your clients `librechat.yaml` file you will need to set:

```yaml
fileStrategy: "s3"
```

That's it!

## Part 4: Deploy the Application

### 1. Deploy RAG API Service

1. Go to the RAG API service
2. Click "Deploy" or wait for automatic deployment
3. Monitor the deployment logs
4. Wait for the service to show "Active" status

### 2. Deploy Client Service

1. Go to the LibreChat client service
2. Click "Deploy" or wait for automatic deployment
3. Monitor the deployment logs
4. Wait for the service to show "Active" status

### 3. Access Your Application

Once both services are deployed and active:

1. Go to your client service
2. Click on the generated domain (or copy it)
3. Open the URL in your browser
4. You should see the LibreChat interface

### 4. Create Your Account

1. Click "Sign Up" on the LibreChat interface
2. Create your admin account
3. Start chatting!

---

## Verification Steps

### Check RAG API Connection

1. Upload a file in a conversation
2. If the upload succeeds, the RAG API is working correctly
3. Try asking questions about the uploaded file

### Check Private Networking

1. Go to the client service deployment logs
2. Look for successful connections to the RAG API
3. There should be no connection errors to `http://librechat-rag-api-dev:8000`

---

## Troubleshooting

### Client Service Won't Start

- Check that all required environment variables are set
- Verify `MONGO_URI` connection string is correct
- Check deployment logs for specific errors

### RAG API Not Connecting

- Verify the RAG API service name is exactly `librechat-rag-api-dev`
- Check that `RAG_HOST=::` is set (for IPv6 private networking)
- Verify `RAG_API_URL=http://librechat-rag-api-dev:8000` in client service
- Check both services are in the same Railway project

### File Uploads Failing

- Verify `ATLAS_MONGO_DB_URI` is identical in both services
- Check that the `rag_vectors` collection exists in your production database
- Verify the vector search index is created for the production database
- Check RAG API logs for errors

### MongoDB Connection Issues

- Ensure you're using the `app_user_prod` credentials
- Verify the database name is `production` (not `test`)
- Check that `0.0.0.0/0` is in Network Access whitelist in MongoDB Atlas
- Ensure passwords are properly URL-encoded if they contain special characters

### Domain/CORS Issues

- Verify `DOMAIN_CLIENT` and `DOMAIN_SERVER` both use `https://` (not `http://`)
- Ensure the domain matches exactly what Railway generated
- Check that the domain is publicly accessible

---

## Environment Variables Reference

### Client Service Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HOST` | Server host binding | `0.0.0.0` |
| `DOMAIN_CLIENT` | Public client URL | `https://your-app.up.railway.app` |
| `DOMAIN_SERVER` | Public server URL | `https://your-app.up.railway.app` |
| `NODE_ENV` | Environment mode | `production` |
| `MONGO_URI` | MongoDB connection | `mongodb+srv://app_user_prod:...` |
| `ATLAS_MONGO_DB_URI` | RAG MongoDB connection | `mongodb+srv://app_user_prod:...` |
| `RAG_API_URL` | RAG API internal URL | `http://librechat-rag-api-dev:8000` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |

### RAG API Service Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `RAG_HOST` | IPv6 binding for private network | `::` |
| `RAG_PORT` | Service port | `8000` |
| `EMBEDDINGS_PROVIDER` | Embedding service | `openai` |
| `EMBEDDINGS_MODEL` | Embedding model | `text-embedding-3-small` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `VECTOR_DB_TYPE` | Vector database type | `atlas-mongo` |
| `ATLAS_MONGO_DB_URI` | MongoDB connection | `mongodb+srv://app_user_prod:...` |
| `ATLAS_SEARCH_INDEX` | Vector index name | `vector_index` |
| `COLLECTION_NAME` | MongoDB collection | `rag_vectors` |
| `CHUNK_SIZE` | Text chunk size | `600` |
| `CHUNK_OVERLAP` | Chunk overlap size | `200` |

---

## Next Steps

- Set up custom domain (optional)
- Configure additional AI models (Anthropic, Google, etc.)
- Set up user authentication providers
- Configure file storage limits
- Set up monitoring and alerts

---

## Additional Resources

- [LibreChat Documentation](https://www.librechat.ai/docs)
- [Railway Documentation](https://docs.railway.app/)
- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)