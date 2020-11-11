pragma solidity ^0.5.16;

import "./ERC20.sol";
import "./Ownable.sol";
import "./SafeMath.sol";

/**
 * @dev Extension of {ERC20} that adds staking mechanism.
 */
contract CustomToken is ERC20, Ownable {
    using SafeMath for uint64;

    uint256 internal _minTotalSupply;
    uint256 internal _maxTotalSupply;
    uint256 internal _stakeStartTime;
    uint256 internal _stakeMinAge;
    uint256 internal _stakeMaxAge;
    uint256 internal _maxInterestRate;
    uint256 internal _stakeMinAmount;
    uint256 internal _stakePrecision;

    struct stakeStruct {
        uint256 amount;
        uint64 time;
    }

    mapping(address => stakeStruct[]) internal _stakes;

    function initialize(
        address sender, uint256 minTotalSupply, uint256 maxTotalSupply, uint64 stakeMinAge, uint64 stakeMaxAge,
        uint8 stakePrecision
    ) public initializer
    {
        Ownable.initialize(sender);

        _minTotalSupply = minTotalSupply;
        _maxTotalSupply = maxTotalSupply;
        _mint(sender, minTotalSupply);
        _stakePrecision = uint256(stakePrecision);

        _stakeStartTime = now;
        _stakeMinAge = uint256(stakeMinAge);
        _stakeMaxAge = uint256(stakeMaxAge);

        _maxInterestRate = uint256(10**17); // 10% annual interest
        _stakeMinAmount = uint256(10**18);  // min stake of 1 token
    }

    function stakeOf(address account) public view returns (uint256) {
        if (_stakes[account].length <= 0) return 0;
        uint256 stake = 0;

        for (uint i = 0; i < _stakes[account].length; i++) {
            stake = stake.add(uint256(_stakes[account][i].amount));
        }
        return stake;
    }

    function stakeAll() public returns (bool) {
        _stake(_msgSender(), balanceOf(_msgSender()));
        return true;
    }

    function unstakeAll() public returns (bool) {
        _unstake(_msgSender());
        return true;
    }

    function reward() public returns (bool) {
        _reward(_msgSender());
        return true;
    }

    // This method should allow adding on to user's stake.
    // Any required constrains and checks should be coded as well.
    function _stake(address sender, uint256 amount) internal {
        // TODO implement this method
    }

    // This method should allow withdrawing staked funds
    // Any required constrains and checks should be coded as well.
    function _unstake(address sender) internal {
        // TODO implement this method
    }

    // This method should allow withdrawing cumulated reward for all staked funds of the user's.
    // Any required constrains and checks should be coded as well.
    // Important! Withdrawing reward should not decrease the stake, stake should be rolled over for the future automatically.
    function _reward(address _address) internal {
        // TODO implement this method
    }

    function _getProofOfStakeReward(address _address) internal view returns (uint256) {
        require((now >= _stakeStartTime) && (_stakeStartTime > 0));

        uint256 _now = now;
        uint256 _coinAge = _getCoinAge(_address, _now);
        if (_coinAge <= 0) return 0;

        uint256 interest = getAnnualInterest();
        uint256 rewarded = (_coinAge * interest).div(365 * 10**_stakePrecision);

        return rewarded;
    }

    function _getCoinAge(address _address, uint256 _now) internal view returns (uint256) {
        if (_stakes[_address].length <= 0) return 0;
        uint256 _coinAge = 0;

        for (uint i = 0; i < _stakes[_address].length; i++) {
            if (_now < uint256(_stakes[_address][i].time).add(_stakeMinAge)) continue;

            uint256 nCoinSeconds = _now.sub(uint256(_stakes[_address][i].time));
            if (nCoinSeconds > _stakeMaxAge) nCoinSeconds = _stakeMaxAge;

            _coinAge = _coinAge.add(uint256(_stakes[_address][i].amount) * nCoinSeconds.div(1 days));
        }

        return _coinAge;
    }

    function _getAnnualInterest() internal view returns(uint256) {
        return _maxInterestRate;
    }

    function _increaseBalance(address account, uint256 amount) internal {
        require(account != address(0), "Balance increase from the zero address");
        _balances[account] = _balances[account].add(amount);
    }

    function _decreaseBalance(address account, uint256 amount) internal {
        require(account != address(0), "Balance decrease from the zero address");
        _balances[account] = _balances[account].sub(amount, "Balance decrease amount exceeds balance");
    }
}