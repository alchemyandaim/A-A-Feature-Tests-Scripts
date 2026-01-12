# A+A Feature Test Scripts

This repository contains Grafana k6 Browser scripts that are executed using GitHub Actions. 
They are designed to be executed by the A+A Feature Tests WordPress plugin.

## Development Setup

### Directory Structure

```
repository/
├─ .github/workflows/
│  └─ aaft-k6-browser.yml
├─ k6/
│  ├─ contact-form.browser.js
│  └─ (other scripts)
└─ readme.md
```

## Feature Test Integration

Each k6 Browser script corresponds to a Feature Test in the A+A Feature Tests WordPress plugin.
A feature test step is responsible for triggering the execution of the k6 Browser script via GitHub Actions and handling the response.


### Required API Keys

#### 1/3) A+A Feature Test Secret Token
The secret token should be a random string assigned as a constant in your `wp-config.php` file:

* GitHub Secret Key Name in GitHub Repo: `AAFT_SECRET_TOKEN`

```php
/* A+A Feature Tests Secret Token
 * This should be a unique, random string, for every individual website.
 * Do not store the secret token in the plugin itself.
 * The secret should also be set in the A-A-Feature-Tests-Scripts repository's GitHub Actions secrets:
 * https://github.com/alchemyandaim/A-A-Feature-Tests-Scripts/settings/secrets/
 */
define( 'AAFT_SECRET_TOKEN', 'XXXxxxxxxxxxXXX' );
```

#### 2/3) Grafana k6 API Key

Grafana k6 also uses an API key. This key should belong to the A-A-Feature-Tests-Scripts under GitHub Actions secrets.
It does not need to be registered through WordPress

* Grafana k6 API Key Name in GitHub Repo: `K6_CLOUD_TOKEN`

#### 3/3) GitHub Personal Access Token

In addition to this randomly generated token, you will also need a GitHub Personal Access Token.

```php
/* A+A Feature Tests GitHub Personal Access Token
 * Tokens can be created in GitHub under Settings > Developer Settings > Personal Access Tokens.
 * Required Permissions: Actions (Read and write) and Metadata (Read-only)
 */
define( 'AAFT_GITHUB_TOKEN', 'github_pat_xxxxxxxxxx' );
```