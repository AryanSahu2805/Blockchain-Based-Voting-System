const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Blockchain Voting System (Upgradeable)...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.utils.formatEther(await deployer.getBalance())}`);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  try {
    // Deploy ElectionFactoryUpgradeable
    console.log("\n📋 Deploying ElectionFactoryUpgradeable...");
    const ElectionFactoryUpgradeable = await ethers.getContractFactory("ElectionFactoryUpgradeable");
    
    const electionFactory = await upgrades.deployProxy(
      ElectionFactoryUpgradeable,
      [deployer.address], // initialOwner
      {
        initializer: "initialize",
        kind: "uups", // Universal Upgradeable Proxy Standard
        unsafeAllow: ["constructor"]
      }
    );
    
    await electionFactory.deployed();
    console.log(`✅ ElectionFactoryUpgradeable deployed to: ${electionFactory.address}`);
    
    // Get implementation address
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(electionFactory.address);
    console.log(`🔧 Implementation address: ${implementationAddress}`);
    
    // Get admin address
    const adminAddress = await upgrades.erc1967.getAdminAddress(electionFactory.address);
    console.log(`👑 Admin address: ${adminAddress}`);
    
    // Deploy ElectionUpgradeable (for testing)
    console.log("\n🗳️ Deploying sample ElectionUpgradeable...");
    const ElectionUpgradeable = await ethers.getContractFactory("ElectionUpgradeable");
    
    const sampleElection = await upgrades.deployProxy(
      ElectionUpgradeable,
      [
        "Sample Election 2024", // title
        Math.floor(Date.now() / 1000) + 3600, // startTime (1 hour from now)
        Math.floor(Date.now() / 1000) + 86400, // endTime (24 hours from now)
        ["Candidate A", "Candidate B", "Candidate C"], // candidateNames
        ["Description A", "Description B", "Description C"], // candidateDescriptions
        ["https://example.com/a.jpg", "https://example.com/b.jpg", "https://example.com/c.jpg"], // candidateImageUrls
        deployer.address // creator
      ],
      {
        initializer: "initialize",
        kind: "uups",
        unsafeAllow: ["constructor"]
      }
    );
    
    await sampleElection.deployed();
    console.log(`✅ Sample Election deployed to: ${sampleElection.address}`);
    
    // Get sample election implementation address
    const sampleElectionImpl = await upgrades.erc1967.getImplementationAddress(sampleElection.address);
    console.log(`🔧 Sample Election implementation: ${sampleElectionImpl}`);
    
    // Create deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        ElectionFactoryUpgradeable: {
          address: electionFactory.address,
          implementation: implementationAddress,
          admin: adminAddress,
          proxyType: "UUPS"
        },
        SampleElection: {
          address: sampleElection.address,
          implementation: sampleElectionImpl,
          proxyType: "UUPS"
        }
      },
      deployment: {
        gasUsed: "N/A", // Would need to track during deployment
        blockNumber: await ethers.provider.getBlockNumber(),
        networkName: network.name
      }
    };
    
    // Save deployment info
    const deploymentPath = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentPath, `deployment-${network.name}-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to: ${deploymentFile}`);
    
    // Verify contracts on Etherscan (if not localhost)
    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log("\n🔍 Verifying contracts on Etherscan...");
      
      try {
        // Wait for contracts to be indexed
        console.log("⏳ Waiting for contracts to be indexed...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Verify ElectionFactoryUpgradeable
        console.log("🔍 Verifying ElectionFactoryUpgradeable...");
        await hre.run("verify:verify", {
          address: implementationAddress,
          constructorArguments: []
        });
        console.log("✅ ElectionFactoryUpgradeable verified");
        
        // Verify Sample Election
        console.log("🔍 Verifying Sample Election...");
        await hre.run("verify:verify", {
          address: sampleElectionImpl,
          constructorArguments: []
        });
        console.log("✅ Sample Election verified");
        
      } catch (error) {
        console.log("⚠️ Verification failed (this is normal for upgradeable contracts):", error.message);
      }
    }
    
    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
    // Test factory functions
    const electionCount = await electionFactory.getElectionCount();
    console.log(`📊 Initial election count: ${electionCount}`);
    
    // Test sample election functions
    const metadata = await sampleElection.getMetadata();
    console.log(`📋 Sample election title: ${metadata.title}`);
    console.log(`👥 Candidate count: ${metadata.candidateCount}`);
    console.log(`🗳️ Total votes: ${metadata.totalVotes}`);
    
    // Get all candidates
    const candidateIds = await sampleElection.getAllCandidateIds();
    console.log(`🎯 Candidate IDs: ${candidateIds.join(", ")}`);
    
    for (const candidateId of candidateIds) {
      const candidate = await sampleElection.getCandidate(candidateId);
      console.log(`  - ${candidate.name}: ${candidate.voteCount} votes`);
    }
    
    console.log("\n🎉 Deployment and testing completed successfully!");
    console.log("\n📋 Contract Addresses:");
    console.log(`   ElectionFactory: ${electionFactory.address}`);
    console.log(`   Sample Election: ${sampleElection.address}`);
    
    // Create .env.local file for frontend
    const envContent = `# Blockchain Voting System - Environment Variables
# Generated on ${new Date().toISOString()}

# Contract Addresses
REACT_APP_ELECTION_FACTORY_ADDRESS=${electionFactory.address}
REACT_APP_SAMPLE_ELECTION_ADDRESS=${sampleElection.address}

# Network Configuration
REACT_APP_NETWORK_NAME=${network.name}
REACT_APP_CHAIN_ID=${network.chainId}

# RPC URLs (update these for your network)
REACT_APP_RPC_URL=${ethers.provider.connection.url}

# Block Explorer URLs
REACT_APP_BLOCK_EXPLORER_URL=${network.name === 'mumbai' ? 'https://mumbai.polygonscan.com' : 
                              network.name === 'polygon' ? 'https://polygonscan.com' : 
                              network.name === 'sepolia' ? 'https://sepolia.etherscan.io' : 
                              'https://etherscan.io'}

# Backend API (update with your backend URL)
REACT_APP_API_URL=http://localhost:5000/api

# Feature Flags
REACT_APP_ENABLE_UPGRADEABLE_CONTRACTS=true
REACT_APP_ENABLE_IPFS_STORAGE=false
REACT_APP_ENABLE_GASLESS_VOTING=false
`;
    
    const envPath = path.join(__dirname, "..", "..", "client", ".env.local");
    fs.writeFileSync(envPath, envContent);
    console.log(`\n📝 Frontend environment file created: ${envPath}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Handle errors
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
  process.exit(1);
});

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment script failed:", error);
    process.exit(1);
  });
