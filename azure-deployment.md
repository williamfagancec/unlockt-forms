# Azure Deployment Guide for Unlockt Form Application

## Prerequisites

1. **Azure Account** with active subscription
2. **Azure CLI** installed locally
3. **Microsoft Entra ID** (formerly Azure AD) tenant access
4. **Node.js 20 LTS** or higher

## Step 1: Set Up Microsoft Entra ID Application

### 1.1 Register Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** → **App registrations** → **New registration**
3. Configure:
   - **Name**: `Unlockt-Form-App`
   - **Supported account types**: Choose based on your needs (single/multi-tenant)
   - **Redirect URI**: 
     - Type: Web
     - URI: `https://your-app-name.azurewebsites.net/auth/redirect`

### 1.2 Generate Client Secret

1. Go to your app registration → **Certificates & secrets**
2. Click **New client secret**
3. Add description: `Production Secret`
4. Select expiration period
5. **Copy the secret value immediately** (shown only once)

### 1.3 Configure API Permissions

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `openid`
   - `profile`
   - `email`
   - `User.Read`
   - `offline_access`
4. Click **Grant admin consent** (if you have admin rights)

### 1.4 Note Your Credentials

Copy these values (you'll need them later):
- **Application (client) ID**: Found on the Overview page
- **Directory (tenant) ID**: Found on the Overview page
- **Client secret value**: Copied in step 1.2

## Step 2: Create Azure PostgreSQL Database

### Option A: Azure Database for PostgreSQL Flexible Server (Recommended)

```bash
# Login to Azure
az login

# Create resource group
az group create --name unlockt-rg --location eastus

# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group unlockt-rg \
  --name unlockt-db-server \
  --location eastus \
  --admin-user dbadmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15

# Create database
az postgres flexible-server db create \
  --resource-group unlockt-rg \
  --server-name unlockt-db-server \
  --database-name unlocktdb

# Configure firewall to allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group unlockt-rg \
  --name unlockt-db-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Get connection string
az postgres flexible-server show-connection-string \
  --server-name unlockt-db-server \
  --database-name unlocktdb \
  --admin-user dbadmin \
  --admin-password "YourSecurePassword123!"
```

### Option B: Use Azure Cosmos DB for PostgreSQL

For high-scale deployments, consider Azure Cosmos DB for PostgreSQL (distributed database).

## Step 3: Deploy to Azure App Service

### 3.1 Create App Service

```bash
# Create App Service plan
az appservice plan create \
  --name unlockt-plan \
  --resource-group unlockt-rg \
  --location eastus \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group unlockt-rg \
  --plan unlockt-plan \
  --name unlockt-form-app \
  --runtime "NODE:20-lts"
```

### 3.2 Configure Environment Variables

```bash
# Set database connection string
az webapp config appsettings set \
  --resource-group unlockt-rg \
  --name unlockt-form-app \
  --settings \
    DATABASE_URL="postgresql://dbadmin:YourSecurePassword123!@unlockt-db-server.postgres.database.azure.com:5432/unlocktdb?sslmode=require" \
    AZURE_CLIENT_ID="your-client-id-from-step-1.4" \
    AZURE_TENANT_ID="your-tenant-id-from-step-1.4" \
    AZURE_CLIENT_SECRET="your-client-secret-from-step-1.4" \
    REDIRECT_URI="https://unlockt-form-app.azurewebsites.net/auth/redirect" \
    POST_LOGOUT_REDIRECT_URI="https://unlockt-form-app.azurewebsites.net" \
    SESSION_SECRET="$(openssl rand -base64 32)" \
    NODE_ENV="production"
```

### 3.3 Deploy Application

#### Method 1: Local Git Deployment

```bash
# Get deployment credentials
az webapp deployment user set --user-name unlocktdeploy --password "DeployPassword123!"

# Get Git URL
az webapp deployment source config-local-git \
  --name unlockt-form-app \
  --resource-group unlockt-rg

# Initialize git (if not already)
git init
git add .
git commit -m "Initial deployment"

# Add Azure remote
git remote add azure <git-url-from-previous-command>

# Deploy
git push azure main
```

#### Method 2: GitHub Actions (Recommended for CI/CD)

1. Create `.github/workflows/azure-deploy.yml` (see below)
2. Configure GitHub secrets:
   - `AZURE_WEBAPP_PUBLISH_PROFILE`
3. Push to GitHub

### 3.4 Run Database Migrations

After deployment, push the database schema:

```bash
# SSH into your app
az webapp ssh --resource-group unlockt-rg --name unlockt-form-app

# Run database push
npm run db:push --force

# Exit SSH
exit
```

## Step 4: Configure Custom Domain (Optional)

```bash
# Map custom domain
az webapp config hostname add \
  --webapp-name unlockt-form-app \
  --resource-group unlockt-rg \
  --hostname forms.yourdomain.com

# Configure SSL
az webapp config ssl bind \
  --name unlockt-form-app \
  --resource-group unlockt-rg \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

## Step 5: Update Entra ID Redirect URIs

1. Go back to your Entra ID app registration
2. Update redirect URIs to include your custom domain:
   - `https://forms.yourdomain.com/auth/redirect`
   - `https://unlockt-form-app.azurewebsites.net/auth/redirect`

## Step 6: Enable Application Insights (Monitoring)

```bash
# Create Application Insights
az monitor app-insights component create \
  --app unlockt-insights \
  --location eastus \
  --resource-group unlockt-rg \
  --application-type web

# Link to Web App
az monitor app-insights component connect-webapp \
  --app unlockt-insights \
  --resource-group unlockt-rg \
  --web-app unlockt-form-app
```

## Step 7: Security Best Practices

### 7.1 Use Azure Key Vault for Secrets

```bash
# Create Key Vault
az keyvault create \
  --name unlockt-keyvault \
  --resource-group unlockt-rg \
  --location eastus

# Enable Managed Identity for App Service
az webapp identity assign \
  --name unlockt-form-app \
  --resource-group unlockt-rg

# Grant Key Vault access to App Service
az keyvault set-policy \
  --name unlockt-keyvault \
  --object-id <app-service-managed-identity-id> \
  --secret-permissions get list

# Store secrets in Key Vault
az keyvault secret set --vault-name unlockt-keyvault --name AZURE-CLIENT-SECRET --value "your-secret"
az keyvault secret set --vault-name unlockt-keyvault --name DATABASE-PASSWORD --value "YourSecurePassword123!"

# Reference in App Service
az webapp config appsettings set \
  --resource-group unlockt-rg \
  --name unlockt-form-app \
  --settings \
    AZURE_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://unlockt-keyvault.vault.azure.net/secrets/AZURE-CLIENT-SECRET)"
```

### 7.2 Configure CORS (if needed for API access)

```bash
az webapp cors add \
  --resource-group unlockt-rg \
  --name unlockt-form-app \
  --allowed-origins "https://yourdomain.com"
```

## Step 8: Microsoft Fabric Integration (Future)

For data lake integration with Microsoft Fabric:

1. **Set up Azure Data Lake Storage Gen2**
2. **Configure Fabric workspace**
3. **Add export endpoint** to push form data to Data Lake
4. **Set up Fabric pipelines** for data transformation

Example export endpoint (add to `index.js`):

```javascript
app.post('/api/export/fabric', authMiddleware, async (req, res) => {
  // Export submissions to Azure Data Lake for Fabric ingestion
  const submissions = await db.select().from(formSubmissions);
  
  // Use Azure SDK to write to Data Lake
  // Implementation depends on your Fabric setup
});
```

## Testing Your Deployment

1. **Test public form**: `https://unlockt-form-app.azurewebsites.net/`
2. **Test admin login**: `https://unlockt-form-app.azurewebsites.net/admin`
3. **Submit test form**
4. **Login with Entra ID**
5. **Test PDF/XLSX exports**

## Monitoring and Logs

```bash
# View live logs
az webapp log tail --resource-group unlockt-rg --name unlockt-form-app

# Download logs
az webapp log download --resource-group unlockt-rg --name unlockt-form-app
```

## Troubleshooting

### Issue: Authentication fails
- Verify redirect URIs match exactly
- Check client secret hasn't expired
- Confirm permissions are granted

### Issue: Database connection fails
- Check firewall rules
- Verify connection string format
- Ensure SSL mode is set to `require`

### Issue: App won't start
- Check environment variables are set
- Review deployment logs: `az webapp log tail`
- Verify Node.js version compatibility

## Cost Optimization

- **Development**: Use B1 tier (~$13/month)
- **Production**: Scale to P1V2 tier for better performance
- **Database**: Start with Burstable tier, scale as needed
- **Enable auto-scale** based on traffic patterns

## Backup and Disaster Recovery

```bash
# Enable automatic backups
az webapp config backup create \
  --resource-group unlockt-rg \
  --webapp-name unlockt-form-app \
  --container-url "<storage-sas-url>" \n  --frequency 1d \
  --retention 7

# Backup database
az postgres flexible-server backup create \
  --resource-group unlockt-rg \
  --name unlockt-db-server
```

## Next Steps

1. **Set up staging environment** for testing
2. **Configure CI/CD pipeline** with GitHub Actions
3. **Implement data lake export** for Microsoft Fabric
4. **Add monitoring dashboards** in Application Insights
5. **Set up alerts** for form submissions and errors
