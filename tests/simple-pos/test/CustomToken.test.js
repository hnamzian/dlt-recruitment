const { solidity } = require("ethereum-waffle");
const { expect } = require("chai").use(solidity);
const { formatUnits, parseUnits } = require("@ethersproject/units");

let customToken;
const minTotalSupply = parseUnits("1000000");
const maxTotalSupply = parseUnits("10000000");
const DAY_IN_SECONDS = 24 * 60 * 60;
const stakeMinAge = 1 * DAY_IN_SECONDS;
const stakeMaxAge = 30 * DAY_IN_SECONDS;
const stakePrecision = 18;

beforeEach(async () => {
  const [deployer] = await ethers.getSigners();

  const CustomToken = await ethers.getContractFactory("CustomToken");
  customToken = await CustomToken.deploy();
  await customToken["initialize(address,uint256,uint256,uint64,uint64,uint8)"](
    deployer.address,
    minTotalSupply,
    maxTotalSupply,
    stakeMinAge,
    stakeMaxAge,
    stakePrecision
  );
});

describe("CustomToken - Initialization", async () => {
  it("should verify vontract is initialized", async () => {
    const [owner] = await ethers.getSigners();

    const balance = await customToken.balanceOf(owner.address);
    const contractOwner = await customToken.owner();
    
    expect(balance).to.be.equal(minTotalSupply);
    expect(contractOwner).to.be.equal(owner.address)
  })
})

describe("CustomToken - Stake", async () => {
  it("should stake all tokens", async () => {
    const [owner] = await ethers.getSigners();

    const toBeStaked = await customToken.balanceOf(owner.address);

    await customToken.approve(customToken.address, toBeStaked);

    await customToken.stakeAll();

    const staked = await customToken.stakeOf(owner.address);

    expect(staked).to.be.equal(toBeStaked);
  })
  it("should revert staking tokens when allowance is not enough", async () => {
    const [owner] = await ethers.getSigners();

    let toBeStaked = await customToken.balanceOf(owner.address);
    toBeStaked = toBeStaked.sub(1);

    await customToken.approve(customToken.address, toBeStaked);

    expect(
      customToken.stakeAll()
    ).to.be.revertedWith("CustomToken: Insufficient Allowance");
  })
  it("should unstaked all staked tokens", async () => {
    const [owner] = await ethers.getSigners();

    const toBeStaked = await customToken.balanceOf(owner.address);

    await customToken.approve(customToken.address, toBeStaked);

    await customToken.stakeAll();

    await customToken.unstakeAll();

    const balance = await customToken.balanceOf(owner.address);
    expect(balance).to.be.equal(toBeStaked);

    const staked = await customToken.stakeOf(owner.address);
    expect(staked).to.be.equal(0);
  })
  it("should revert unstaking token when staked balance is zero", async () => {
    const [owner] = await ethers.getSigners();

    expect(
      customToken.unstakeAll()
    ).to.be.revertedWith("CustomToken: No Staked Balance");
  })
})