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
