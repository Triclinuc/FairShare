import { readFileSync } from "fs";
import {
  Account,
  Args,
  SmartContract,
  JsonRpcProvider,
} from "@massalabs/massa-web3";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const deploy = async () => {
  // Validate environment variables
  const secretKey = process.env.SECRET_KEY || process.env.WALLET_PRIVATE_KEY;
  const networkUrl = process.env.JSON_RPC_URL_PUBLIC;

  if (!secretKey) {
    throw new Error(
      "Missing SECRET_KEY or WALLET_PRIVATE_KEY in .env file. Please add your wallet private key."
    );
  }

  if (!networkUrl) {
    throw new Error(
      "Missing JSON_RPC_URL_PUBLIC in .env file. Please add the network endpoint (e.g., https://buildnet.massa.net/api/v2)"
    );
  }

  console.log("🚀 Starting FairShare Smart Contract Deployment");
  console.log(`📡 Network: ${networkUrl}`);
  console.log(`📝 Contract: build/main.wasm`);
  console.log("");

  try {
    // Create account from secret key
    const account = await Account.fromPrivateKey(secretKey);
    console.log(`💼 Deploying from address: ${account.address}`);
    console.log("");

    // Create provider
    const provider = JsonRpcProvider.fromRPCUrl(networkUrl, account);

    // Read the compiled WASM file
    const wasmBuffer = readFileSync("build/main.wasm");
    const wasmData = new Uint8Array(wasmBuffer);

    // Calculate storage cost: 0.001 MAS per byte
    // Add 20% margin for safety
    const wasmSizeBytes = wasmData.length;
    const storageCostPerByte = 0.001; // MAS per byte
    const storageCostMAS = wasmSizeBytes * storageCostPerByte * 1.2; // 20% margin

    console.log(`📏 Contract size: ${wasmSizeBytes} bytes`);
    console.log(`💰 Estimated storage cost: ${storageCostMAS.toFixed(4)} MAS`);
    console.log("");
    console.log("🔄 Deploying contract...");
    console.log("");

    // Prepare constructor arguments (none needed for this contract)
    const constructorArgs = new Args();

    // Deploy the smart contract
    const contract = await SmartContract.deploy(
      provider,
      wasmData,
      constructorArgs,
      {
        coins: 5_000_000_000n, // 5 MAS
        fee: 100_000_000n, // 0.1 MAS transaction fee
        maxGas: 3_980_167_295n, // Maximum gas limit
        waitFinalExecution: true, // Wait for block finalization
        periodToLive: 9, // Operation TTL in periods
      }
    );

    console.log("✅ Deployment successful!");
    console.log("");
    console.log("📋 Deployment Details:");
    console.log(`Contract Address: ${contract.address}`);
    console.log("");
    console.log("💡 Next Steps:");
    console.log("1. Save the contract address in frontend/src/config/contract.ts");
    console.log("2. Test contract functions using the frontend");
    console.log("3. Monitor transactions on the Massa BuildNet explorer:");
    console.log(`   https://buildnet-explorer.massa.net/address/${contract.address}`);
    console.log("");
    console.log("🎉 FairShare is now live on Massa BuildNet!");

    return contract;
  } catch (error) {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }
};

// Run deployment
deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
