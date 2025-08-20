const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy ElectionFactory
  console.log("\nDeploying ElectionFactory...");
  const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
  const electionFactory = await ElectionFactory.deploy();
  
  await electionFactory.deployed();
  
  console.log("ElectionFactory deployed to:", electionFactory.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    electionFactory: {
      address: electionFactory.address,
      transactionHash: electionFactory.deployTransaction.hash,
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };
  
  // Save to contracts directory
  const contractsDir = path.join(__dirname, "../contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(contractsDir, `deployment-${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // Save ABIs for frontend
  const frontendContractsDir = path.join(__dirname, "../client/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }
  
  // Copy ABI files
  const electionFactoryArtifact = await hre.artifacts.readArtifact("ElectionFactory");
  const electionArtifact = await hre.artifacts.readArtifact("Election");
  
  fs.writeFileSync(
    path.join(frontendContractsDir, "ElectionFactory.json"),
    JSON.stringify(electionFactoryArtifact, null, 2)
  );
  
  fs.writeFileSync(
    path.join(frontendContractsDir, "Election.json"),
    JSON.stringify(electionArtifact, null, 2)
  );
  
  // Create environment variables file for frontend
  const envContent = `REACT_APP_ELECTION_FACTORY_ADDRESS=${electionFactory.address}
REACT_APP_CHAIN_ID=${hre.network.config.chainId}
REACT_APP_NETWORK_NAME=${hre.network.name}
`;
  
  fs.writeFileSync(
    path.join(__dirname, "../client/.env.local"),
    envContent
  );
  
  console.log("\n✅ Deployment completed successfully!");
  console.log("📋 Deployment summary:");
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   ElectionFactory: ${electionFactory.address}`);
  console.log(`   Transaction: ${electionFactory.deployTransaction.hash}`);
  console.log("📁 Files created:");
  console.log(`   - contracts/deployment-${hre.network.name}.json`);
  console.log(`   - client/src/contracts/ElectionFactory.json`);
  console.log(`   - client/src/contracts/Election.json`);
  console.log(`   - client/.env.local`);
  
  // Verify contract if on testnet/mainnet
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await electionFactory.deployTransaction.wait(6);
    
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: electionFactory.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
