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

describe("CustomToken", async () => {
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
  it("should verify vontract is initialized", async () => {
    const [owner] = await ethers.getSigners();

    const balance = await customToken.balanceOf(owner.address);
    const contractOwner = await customToken.owner();
    
    expect(balance).to.be.equal(minTotalSupply);
    expect(contractOwner).to.be.equal(owner.address)
  })
})