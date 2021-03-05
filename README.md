Faucet for Ethereum Holders

Task: https://www.notion.so/Faucet-for-Ethereum-Holders-51f72ebd500246e298f3be6d470bc6e0

## Live Demo: http://95.216.165.53:3000/

#### How to start

Update configs:
* /packages/backend/src/nearconfig.ts
* /packages/frontend/src/nearconfig.ts
* /packages/frontend/.env.development
* /packages/frontend/.env.production

From the root folder of this repo, run

```bash
yarn install # Install root dependencies (for TS & linting in your IDE)
cd packages/backend && yarn install # Install backend packages
cd ../frontend && yarn install # Install frontend packages
cd ../.. # Go back to root folder
yarn start # Will launch the frontend and the backend at the same time
```

The backend should be running on `localhost:8000`, and the frontend on `localhost:3456`.

####

One-click Login with Blockchain: A MetaMask Tutorial https://www.toptal.com/ethereum/one-click-login-flows-a-metamask-tutorial
