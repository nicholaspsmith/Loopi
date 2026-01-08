# GitHub Actions Secrets Setup

This document describes how to configure GitHub Actions secrets for the CI/CD pipeline.

## Required Secrets

Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

### 1. `CODECOV_TOKEN` (Optional)

- **Description**: Token for uploading test coverage reports to Codecov
- **How to obtain**: Sign up at [codecov.io](https://codecov.io), add your repository, copy the upload token
- **Used in**: `.github/workflows/ci.yml` (coverage upload step)

### 2. `VPS_SSH_KEY`

- **Description**: Private SSH key for deploying to the VPS
- **How to generate**:

  ```bash
  # On your local machine
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/loopi_deploy

  # Add public key to VPS
  ssh-copy-id -i ~/.ssh/loopi_deploy.pub deploy@your-vps-ip

  # Copy private key content for GitHub secret
  cat ~/.ssh/loopi_deploy
  ```

- **Value**: Paste the entire private key content (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)
- **Used in**: `.github/workflows/deploy.yml` (SSH connection to VPS)

### 3. `VPS_HOST`

- **Description**: IP address or hostname of your VPS
- **Example**: `123.456.789.012` or `loopi.nicholaspsmith.com`
- **Used in**: `.github/workflows/deploy.yml` (SSH target)

### 4. `VPS_USER`

- **Description**: Username for SSH connection to VPS
- **Example**: `deploy` or `loopi`
- **Used in**: `.github/workflows/deploy.yml` (SSH user)

### 5. `NEXT_PUBLIC_APP_URL` (Optional)

- **Description**: Public URL of the deployed application
- **Example**: `https://loopi.nicholaspsmith.com`
- **Used in**: `.github/workflows/deploy.yml` (build-time environment variable)

### 6. `DEPLOYMENT_WEBHOOK_URL` (Optional)

- **Description**: Discord or Slack webhook URL for deployment notifications
- **How to obtain**:
  - **Discord**: Server Settings → Integrations → Webhooks → New Webhook
  - **Slack**: [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks)
- **Used in**: `.github/workflows/deploy.yml` (success/failure notifications)

## Verification

After adding secrets, verify they appear in:
**Settings → Secrets and variables → Actions → Repository secrets**

You should see:

- `VPS_SSH_KEY`
- `VPS_HOST`
- `VPS_USER`
- `CODECOV_TOKEN` (optional)
- `NEXT_PUBLIC_APP_URL` (optional)
- `DEPLOYMENT_WEBHOOK_URL` (optional)

## Security Notes

1. **Never commit secrets** to the repository
2. **Rotate SSH keys** regularly (every 6-12 months)
3. **Use dedicated deploy user** on VPS (don't use root)
4. **Limit secret access** to necessary workflows only
5. **Monitor secret usage** in Actions logs

## Testing

To test if secrets are configured correctly:

1. Push a commit to a feature branch
2. Check GitHub Actions tab for workflow runs
3. Verify CI workflow completes without authentication errors
4. For deployment secrets, merge to `main` and watch deploy workflow
