const { solidity } = require("ethereum-waffle");
const { expect } = require("chai").use(solidity);
const { formatUnits, parseUnits } = require("@ethersproject/units");

let customToken;
const minTotalSupply = parseUnits("1000000");
const maxTotalSupply = parseUnits("10000000");
const DAY_IN_SECONDS = 24 * 60 * 60;
const YEAR_IN_SECONDS = 365 * DAY_IN_SECONDS;
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

    await expect(
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

    await expect(
      customToken.unstakeAll()
    ).to.be.revertedWith("CustomToken: No Staked Balance");
  })
  it("should get rewards for staking tokens", async () => {
    const [owner] = await ethers.getSigners();

    const toBeStaked = await customToken.balanceOf(owner.address);

    await customToken.approve(customToken.address, toBeStaked);

    await customToken.stakeAll();

    const rewardTimestamps = [
      Math.floor(stakeMaxAge / 4),
      Math.floor(stakeMaxAge / 2),
      stakeMaxAge,
      stakeMaxAge * 2
    ];

    for (let i = 0; i < rewardTimestamps.length; i++) {
      const wiatTime = i === 0 ? rewardTimestamps[0] : rewardTimestamps[i] - rewardTimestamps[i - 1];
      ethers.provider.send("evm_increaseTime", [wiatTime]);

      await customToken.reward();

      const balance = await customToken.balanceOf(owner.address);
      const rewarded = await customToken.rewardsOf(owner.address);

      const rewardRate = (Math.min(stakeMaxAge, rewardTimestamps[i]) / YEAR_IN_SECONDS) * 0.1;
      const rewards = +formatUnits(toBeStaked) * rewardRate;

      expect(+formatUnits(rewarded)).to.be.closeTo(rewards, 1e-1)
      expect(+formatUnits(balance)).to.be.closeTo(rewards, 1e-1)
    }
  })
  it("should get rewards proportion to stakeMaxAge even afterwards", async () => {
    const [owner] = await ethers.getSigners();

    const toBeStaked = await customToken.balanceOf(owner.address);

    await customToken.approve(customToken.address, toBeStaked);

    await customToken.stakeAll();

    ethers.provider.send("evm_increaseTime", [stakeMaxAge * 2]);

    await customToken.reward();

    const balance = await customToken.balanceOf(owner.address);
    const rewarded = await customToken.rewardsOf(owner.address);

    const rewardRate = (stakeMaxAge / YEAR_IN_SECONDS) * 0.1;
    const rewards = +formatUnits(toBeStaked) * rewardRate;

    expect(+formatUnits(rewarded)).to.be.closeTo(rewards, 1e-1)
    expect(+formatUnits(balance)).to.be.closeTo(rewards, 1e-1)
  })
  it("should test stake-reward-unstake cycle succesfully", async () => {
    const [owner] = await ethers.getSigners();

    const untilReward = (stakeMaxAge / 3);
    const untilUnstake = stakeMaxAge * 2;

    for (let i = 0; i < 5; i++) {
      // stake all balance
      const toBeStaked = await customToken.balanceOf(owner.address);

      await customToken.approve(customToken.address, toBeStaked);

      await customToken.stakeAll();

      // get rewards
      ethers.provider.send("evm_increaseTime", [untilReward]);

      await customToken.reward();

      let balance = await customToken.balanceOf(owner.address);
      let rewarded = await customToken.rewardsOf(owner.address);

      let rewardRate = (Math.min(stakeMaxAge, untilReward) / YEAR_IN_SECONDS) * 0.1;
      let rewards = +formatUnits(toBeStaked) * rewardRate;

      expect(+formatUnits(rewarded)).to.be.closeTo(rewards, 1e-1)
      expect(+formatUnits(balance)).to.be.closeTo(rewards, 1e-1)

      // unstake all tokens
      ethers.provider.send("evm_increaseTime", [untilUnstake]);

      await customToken.unstakeAll();

      const staked = await customToken.stakeOf(owner.address);
      balance = await customToken.balanceOf(owner.address);

      rewardRate = (Math.min(stakeMaxAge, untilReward + untilUnstake) / YEAR_IN_SECONDS) * 0.1;
      rewards = +formatUnits(toBeStaked) * rewardRate;
      const desiredBalance = rewards + +formatUnits(toBeStaked);

      expect(staked).to.be.equal(0);
      expect(+formatUnits(balance)).to.be.closeTo(desiredBalance, 1e-1)
    }
  })
})