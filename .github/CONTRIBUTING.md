# Contributing to LibreChat Template

Thank you for contributing to our LibreChat template project! This guide outlines our branching strategy, development workflow, and best practices.

---

## Table of Contents

- [Branch Structure](#branch-structure)
- [Development Workflow](#development-workflow)
- [Environment Management](#environment-management)
- [Configuration Files](#configuration-files)
- [Pull Request Process](#pull-request-process)
- [Important Rules](#important-rules)

---

## Branch Structure

Our repository follows a three-tier branching model:

```
main (template defaults)
  ├── staging/<project-name> (test environment)
  │     └── <project-name> (production environment)
  │
  └── <username>/ENG-XXX-description (feature branches)
```

### Branch Types

- **`main`**: Template branch with default/example configurations for new projects
- **`staging/<project-name>`**: Test environment branches for each project
- **`<project-name>`**: Production environment branches for each project
- **`<username>/ENG-XXX-description`**: Feature development branches (Linear ticket format)

---

## Development Workflow

### Adding New Features to Template

When developing features that should be available to all projects:

1. **Create a feature branch from `main`**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b <username>/ENG-XXX-description
   ```
   
   > Example: `git checkout -b jane/ENG-123-add-rag-pagination`

2. **Develop and test your feature locally**
   ```bash
   # Make your changes
   git add .
   git commit -m "feat: description of your feature"
   ```

3. **Push and create a Pull Request to `main`**
   ```bash
   git push origin <username>/ENG-XXX-description
   ```
   - Open a PR on GitHub targeting `main`
   - Request review from team members
   - Address any feedback

4. **Roll out to projects**
   
   Once merged to `main`, roll out the feature to individual projects:
   
   ```bash
   # Update staging environment
   git checkout staging/<project-name>
   git merge main
   git push origin staging/<project-name>
   
   # After testing in staging, update production
   git checkout <project-name>
   git merge staging/<project-name>
   git push origin <project-name>
   ```

### Developing Project-Specific Features

When working on features specific to a single project:

1. **Create a feature branch from the staging branch**
   ```bash
   git checkout staging/<project-name>
   git pull origin staging/<project-name>
   git checkout -b <username>/ENG-XXX-project-specific-feature
   ```
   
   > Example: `git checkout -b alden/ENG-456-customer-portal-auth`

2. **Develop and test in the staging environment**

3. **Create a Pull Request to the staging branch**
   ```bash
   git push origin <username>/ENG-XXX-project-specific-feature
   ```
   - Open a PR targeting `staging/<project-name>`
   - Test thoroughly in staging environment

4. **Merge to production after approval**
   ```bash
   git checkout <project-name>
   git merge staging/<project-name>
   git push origin <project-name>
   ```

---

## Environment Management

### Environment File Structure

Each project requires its own environment configuration:

```
.env                    # Active environment (gitignored)
.env.example           # Template for new projects (committed to main)
.env.<project-name>    # Project-specific config (gitignored, stored locally)
```

### Switching Between Projects

**CRITICAL**: Always save your current environment before switching projects!

```bash
# Save current project environment
cp .env .env.<current-project>

# Switch to another project
git checkout <target-project>
cp .env.<target-project> .env
```

### Environment Variable Changes

⚠️ **IMPORTANT**: Before modifying any project's environment variables:

1. **Notify the #engineering channel in Slack**
2. **Document the change and reason**
3. **After making changes, save them:**
   ```bash
   cp .env .env.<project-name>
   ```

### Setting Up a New Project Environment

1. **Copy the example environment**
   ```bash
   cp .env.example .env.<new-project>
   ```

2. **Update the variables** according to [deployment guide](./DEPLOYMENT.md)

3. **Load the environment**
   ```bash
   cp .env.<new-project> .env
   ```

---

## Configuration Files

### librechat.yaml

The `librechat.yaml` file contains custom application configuration for LibreChat.

#### Configuration by Branch:

- **`main`**: Contains default/example configuration for new projects
- **`staging/<project-name>`**: Contains project-specific test environment config
- **`<project-name>`**: Contains project-specific production environment config

### ⚠️ CRITICAL RULES for librechat.yaml

1. **NEVER merge `librechat.yaml` between branches**
2. **NEVER push project-specific configs to `main`**
3. **Each branch maintains its own `librechat.yaml`**
4. **Commit `librechat.yaml` to its respective branch only**

### Workflow for Configuration Changes

#### Updating Template Defaults (main branch)

```bash
git checkout main
# Edit librechat.yaml with example/default values
git add librechat.yaml
git commit -m "docs: update example librechat.yaml config"
git push origin main
```

#### Updating Project Configuration

```bash
# For staging environment
git checkout staging/<project-name>
# Edit librechat.yaml for test environment
git add librechat.yaml
git commit -m "config: update <project-name> staging config"
git push origin staging/<project-name>

# For production environment (after testing)
git checkout <project-name>
# Edit librechat.yaml for production environment
git add librechat.yaml
git commit -m "config: update <project-name> production config"
git push origin <project-name>
```

---

## Pull Request Process

### PR Title Format

Use conventional commits format:

- `feat: add new authentication provider`
- `fix: resolve RAG API connection issue`
- `docs: update deployment instructions`
- `config: update project settings for staging`
- `chore: update dependencies`

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated if needed
- [ ] Environment variables documented
- [ ] `librechat.yaml` changes only in appropriate branch
- [ ] Reviewed by at least one team member
- [ ] #engineering channel notified of any env changes

### Review Process

1. **Submit PR** with clear description of changes
2. **Request review** from relevant team members
3. **Address feedback** and update PR
4. **Merge** after approval (squash and merge preferred)

---

## Important Rules

### 🚫 DO NOT

- ❌ Merge `librechat.yaml` between branches
- ❌ Push project-specific configs to `main`
- ❌ Switch branches without saving environment files
- ❌ Modify environment variables without Slack notification
- ❌ Commit `.env` files (they're gitignored)
- ❌ Push directly to `main` or production branches

### ✅ DO

- ✓ Keep `main` branch in default configuration
- ✓ Test features in staging before production
- ✓ Save environment files before switching branches
- ✓ Notify #engineering of env changes
- ✓ Create feature branches for new work
- ✓ Use pull requests for all changes
- ✓ Document configuration changes

---

## Quick Reference

### Common Commands

```bash
# Start new feature (with Linear ticket)
git checkout main && git pull
git checkout -b <username>/ENG-XXX-description

# Switch projects
cp .env .env.<current-project>
git checkout <target-project>
cp .env.<target-project> .env

# Save env changes
cp .env .env.<project-name>

# Roll out feature to project
git checkout staging/<project-name>
git merge main
# Test in staging, then:
git checkout <project-name>
git merge staging/<project-name>
```

### Branch Flow Diagram

```
Feature Development:
<username>/ENG-XXX-description → (PR) → main → staging/<project> → <project>

Project-Specific Development:
<username>/ENG-XXX-project-feature → (PR) → staging/<project> → <project>
```

---

## Getting Help

- **Slack**: #engineering channel for questions and notifications
- **Documentation**: 
  - [Setup Guide](./librechat-railway-setup.md)
  - [Deployment Guide](./DEPLOYMENT.md)
- **Team**: Reach out to any team member for guidance

---

## Version Control Best Practices

1. **Commit often** with descriptive messages
2. **Pull before push** to avoid conflicts
3. **Keep commits atomic** (one logical change per commit)
4. **Use branches** for all development work
5. **Clean up** feature branches after merging
6. **Rebase** feature branches on main before PR (optional but recommended)

---

Thank you for following these guidelines and helping maintain a clean, organized codebase! 🚀