const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ElectionFactory", function () {
  let ElectionFactory, electionFactory, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    ElectionFactory = await ethers.getContractFactory("ElectionFactory");
    electionFactory = await ElectionFactory.deploy();
    await electionFactory.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await electionFactory.owner()).to.equal(owner.address);
    });
  });

  describe("Election Creation", function () {
    const title = "Test Election";
    const description = "Test Description";
    const candidateNames = ["Alice", "Bob"];
    const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
    const endTime = startTime + 3600; // 1 hour later

    it("Should create an election successfully", async function () {
      const tx = await electionFactory.createElection(
        title,
        description,
        candidateNames,
        startTime,
        endTime
      );

      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "ElectionCreated");

      expect(event).to.not.be.undefined;
    });

    it("Should fail with less than 2 candidates", async function () {
      await expect(
        electionFactory.createElection(
          title,
          description,
          ["Alice"],
          startTime,
          endTime
        )
      ).to.be.revertedWith("Need at least 2 candidates");
    });
  });
});

describe("Election", function () {
  let Election, election, owner, voter1, voter2;

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();
    
    Election = await ethers.getContractFactory("Election");
    
    const startTime = Math.floor(Date.now() / 1000) + 60;
    const endTime = startTime + 3600;
    
    election = await Election.deploy(
      "Test Election",
      "Test Description",
      ["Alice", "Bob"],
      startTime,
      endTime,
      owner.address
    );
    await election.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct title", async function () {
      expect(await election.title()).to.equal("Test Election");
    });

    it("Should set the correct creator", async function () {
      expect(await election.owner()).to.equal(owner.address);
    });

    it("Should have 2 candidates", async function () {
      expect(await election.candidateCount()).to.equal(2);
    });
  });

  describe("Voting", function () {
    it("Should not allow voting before start time", async function () {
      await expect(
        election.connect(voter1).vote(1)
      ).to.be.revertedWith("Voting has not started");
    });
  });
});
