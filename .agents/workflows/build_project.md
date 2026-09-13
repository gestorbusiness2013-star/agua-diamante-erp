# Build Workflow for Agua Diamante ERP

This guide describes the step-by-step process to install dependencies, perform type checks, and build the Next.js production bundle.

## Step 1: Install Dependencies
Run the following command to install the project dependencies:
```powershell
npm.cmd install
```

## Step 2: Run Type Checks
Verify that there are no TypeScript compiler errors by running:
```powershell
npm.cmd run typecheck
```

## Step 3: Build the Project
Compile the Next.js application for production:
```powershell
npm.cmd run build
```
