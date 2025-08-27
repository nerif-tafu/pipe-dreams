# 🚀 Deployment Guide - GitHub Actions Self-Hosted Runner

This guide will help you set up automatic deployment of your Pipe Dreams app using GitHub Actions with a self-hosted runner. Every time you push a commit to the `main` branch, your app will automatically build and deploy.

## 📋 Prerequisites

- A server or local machine where you want to host the app
- Node.js 20+ installed
- Git installed
- Administrator/sudo access
- A GitHub repository with your code

## 🏗️ Architecture

This deployment uses a **Node.js backend** approach:

1. **SvelteKit App**: Built with `@sveltejs/adapter-node`, runs as a Node.js server on port 3000
2. **Nginx**: Acts as a reverse proxy, forwarding requests to the Node.js app
3. **systemd**: Manages the Node.js service (auto-restart, logging, etc.)
4. **GitHub Actions**: Automatically builds and deploys on every push to `main`

## 🔧 Setup Instructions

### Step 1: Set Up GitHub Actions Runner

1. Go to your GitHub repository
2. Navigate to **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Follow the setup instructions for your Linux server
5. Ensure the runner is configured to run on `self-hosted`

### Step 2: Configure Nginx

The nginx configuration is set up as a backend server for reverse proxy. Your main nginx server should proxy requests to this server.

### Step 3: Test the Deployment

1. Make a small change to your code
2. Commit and push to the `main` branch:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. Check the GitHub Actions tab in your repository to see the deployment progress
4. Visit your domain to see the deployed app

## 📁 File Structure

After setup, your deployment will have this structure:

```
/var/www/pipe-dreams/          # Deployment directory
├── build/                     # Built Node.js application
│   ├── index.js              # Main application entry point
│   ├── client/               # Client-side assets
│   └── server/               # Server-side code
├── node_modules/             # Production dependencies
├── package.json              # Package configuration
└── package-lock.json         # Dependency lock file
```

## 🔍 Monitoring and Troubleshooting

### Check Runner Status

```bash
# Check if runner is running
sudo systemctl status actions.runner.*

# View runner logs
journalctl -u actions.runner.* -f

# Restart runner if needed
sudo systemctl restart actions.runner.*
```

### Check Application Status

```bash
# Check Node.js application status
sudo systemctl status pipe-dreams

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t  # Test configuration

# View application logs
sudo journalctl -u pipe-dreams -f

# Restart application if needed
sudo systemctl restart pipe-dreams
```

### View Deployment Logs

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. Click on the latest workflow run
4. View the build and deployment logs

## 🔒 Security Considerations

### Reverse Proxy Configuration

**Main Nginx Server (SSL termination):**
```nginx
server {
    listen 443 ssl;
    server_name pipes.tafu.casa;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    location / {
        proxy_pass http://backend-server:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Configuration

```bash
# Allow HTTP only (SSL handled by reverse proxy)
sudo ufw allow 80
sudo ufw enable
```

## 🚨 Common Issues and Solutions

### Runner Not Starting
- Check if the runner token is correct
- Ensure the runner has proper permissions
- Verify network connectivity to GitHub

### Build Failures
- Check Node.js version (requires 20+)
- Ensure all dependencies are installed
- Review the build logs in GitHub Actions

### Deployment Issues
- Verify the deployment directory exists and has proper permissions
- Check web server configuration
- Ensure the web server is running

### App Not Loading
- Check if the built files are in the deployment directory
- Verify web server configuration
- Check browser console for JavaScript errors

## 📊 Performance Optimization

### Nginx Configuration
The provided nginx config includes:
- Gzip compression
- Static asset caching
- Proxy header support
- SPA routing support

## 🔄 Updating the Runner

To update the GitHub Actions runner, follow the official GitHub documentation for updating self-hosted runners.

## 📞 Support

If you encounter issues:

1. Check the GitHub Actions logs in your repository
2. Review the runner logs on your server
3. Verify all prerequisites are met
4. Ensure proper network connectivity

## 🎉 Success!

Once everything is set up, your workflow will be:

1. **Develop** → Make changes to your code
2. **Commit** → Push to `main` branch
3. **Automate** → GitHub Actions builds and deploys
4. **Deploy** → Your app is live at your domain

Your Pipe Dreams app will now automatically deploy every time you push to the main branch! 🚀
