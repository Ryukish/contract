// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

// OpenZeppelin v4
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from  "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Treasury } from "../treasury/Treasury.sol";
import { Staking } from "../governance/Staking.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { BitMaps } from "@openzeppelin/contracts/utils/structs/BitMaps.sol";

/**
 * @title GovernorRewards
 * @author Railgun Contributors
 * @notice Distributes treasury funds to active governor
 */
contract GovernorRewards is Initializable, OwnableUpgradeable {
  using SafeERC20 for IERC20;
  using BitMaps for BitMaps.BitMap;

  // Staking contract
  Staking public staking;

  // Treasury contract
  Treasury public treasury;

  // Staking intervals per distribution interval
  uint256 private constant STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER = 14; // 14 days

  // Staking contract constant imported locally for cheaper calculations
  // solhint-disable-next-line var-name-mixedcase
  uint256 public STAKING_DEPLOY_TIME;

  // Distribution interval, calculated at initialization time
  // solhint-disable-next-line var-name-mixedcase
  uint256 public DISTRIBUTION_INTERVAL;

  // Number of basis points that equal 100%
  uint256 public constant BASIS_POINTS = 10000;

  // Basis points to distribute each interval
  uint256 public intervalBP;

  // Fee distribution claimed
  event Claim(IERC20 token, address account, uint256 amount, uint256 startInterval, uint256 endInterval);

  // Bitmap of claimed intervals
  // Internal types not allowed on public variables so custom getter needs to be created
  // Account -> Token -> IntervalClaimed
  mapping(address => mapping(IERC20 => BitMaps.BitMap)) private claimedBitmap;

  // Earmaked tokens for each interval
  // Token -> Interval -> Amount
  mapping(IERC20 => mapping(uint256 => uint256)) public earmarked;

  // Tokens to airdrop
  mapping(IERC20 => bool) public tokens;

  // Last interval that we've earmarked for each token
  mapping(IERC20 => uint256) public lastEarmarkedInterval;

  // Starting interval
  uint256 public startingInterval;

  /**
   * @notice Sets contracts addresses and initial value
   * @param _owner - initial owner address
   * @param _staking - Staking contract address
   * @param _treasury - Treasury contract address
   * @param _startingInterval - interval to start distribution at
   * @param _tokens - tokens to distribute
   */
  function initializeGovernorRewards(
    address _owner,
    Staking _staking,
    Treasury _treasury,
    uint256 _startingInterval,
    IERC20[] calldata _tokens
  ) external initializer {
    // Call initializers
    OwnableUpgradeable.__Ownable_init();

    // Set owner
    OwnableUpgradeable.transferOwnership(_owner);

    // Set contract addresses
    treasury = _treasury;
    staking = _staking;

    // Get staking contract constants
    STAKING_DEPLOY_TIME = staking.DEPLOY_TIME();
    DISTRIBUTION_INTERVAL = staking.SNAPSHOT_INTERVAL() * STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER;

    // Set starting interval
    startingInterval = _startingInterval;

    // Set initial tokens to distribute
    for (uint256 i = 0; i < _tokens.length; i += 1) {
      tokens[_tokens[i]] = true;
    }
  }

  /**
   * @notice Gets wheather a interval has been claimed or not
   * @param _account - account to check claim status for
   * @param _token - token to get claim status for
   * @param _interval - interval to check for
   * @return claimed
   */
  function getClaimed(address _account, IERC20 _token, uint256 _interval) external view returns (bool) {
    return claimedBitmap[_account][_token].get(_interval);
  }

  /**
   * @notice Sets new distribution rate
   * @param _newIntervalBP - new distribution rate
   */
  function setIntervalBP(uint256 _newIntervalBP) external onlyOwner {
    intervalBP = _newIntervalBP;
  }

  /**
   * @notice Gets interval at time
   * @param _time - time to get interval of
   * @return interval
   */
  function intervalAtTime(uint256 _time) public view returns (uint256) {
    require(_time >= STAKING_DEPLOY_TIME, "Staking: Requested time is before contract was deployed");
    return (_time - STAKING_DEPLOY_TIME) / DISTRIBUTION_INTERVAL;
  }

  /**
   * @notice Converts distribution interval to staking interval
   * @param _distributionInterval - distribution interval to get staking interval of
   * @return staking interval
   */
  function distributionIntervalToStakingInterval(uint256 _distributionInterval) public pure returns (uint256) {
    return _distributionInterval * STAKING_DISTRIBUTION_INTERVAL_MULTIPLIER;
  }

  /**
   * @notice Gets current interval
   * @return interval
   */
  function currentInterval() public view returns (uint256) {
    return intervalAtTime(block.timestamp);
  }

  /**
   * @notice Adds new tokens to distribution set
   * @param _tokens - new tokens to distribute
   */
  function addTokens(IERC20[] calldata _tokens) external onlyOwner {
    // Get current interval
    uint256 _currentInterval = currentInterval();

    // Don't set last earmarked interval to less than starting interval
    if (_currentInterval < startingInterval) { 
      _currentInterval = startingInterval;
    }

    // Add tokens to distribution set
    for (uint256 i = 0; i < _tokens.length; i += 1) {
      tokens[_tokens[i]] = true;
      lastEarmarkedInterval[_tokens[i]] = currentInterval();
    }
  }

  /**
   * @notice Removes tokens from distribution set
   * @param _tokens - tokens to stop distributing
   */
  function removeTokens(IERC20[] calldata _tokens) external onlyOwner {
    // Add tokens to distribution set
    for (uint256 i = 0; i < _tokens.length; i += 1) {
      tokens[_tokens[i]] = false;
    }
  }

  /**
   * @notice Verifies hint is correct for global snapshots
   * @param _stakingInterval - interval to check hint against
   * @param _hint - off-chain computed index of interval
   * @return valid
   */
  function validateGlobalSnapshotHint(uint256 _stakingInterval, uint256 _hint) public view returns (bool) {
    require(_stakingInterval <= staking.currentInterval(), "Staking: Interval out of bounds");

    // Check if hint is correct, else fall back to binary search
    return (
      _hint <= staking.globalsSnapshotLength()
      && (_hint == 0 || staking.globalsSnapshot(_hint - 1).interval < _stakingInterval)
      && (_hint == staking.globalsSnapshotLength() || staking.globalsSnapshot(_hint).interval >= _stakingInterval)
    );
  }

  /**
   * @notice Fetch and decompress series of global snapshots
   * @param _startingInterval - starting interval to fetch from
   * @param _endingInterval - interval to fetch to
   * @param _hint - off-chain computed index of interval
   * @return array of snapshot data
   */
  function fetchGlobalSnapshots(
    uint256 _startingInterval,
    uint256 _endingInterval,
    uint256 _hint
  ) public view returns (uint256[] memory) {

  }

  /**
   * @notice Verifies hint is correct for account snapshots
   * @param _stakingInterval - interval to check hint against
   * @param _account - account of interval
   * @param _hint - off-chain computed index of interval
   * @return array of snapshot data
   */
  function validateAccountSnapshotHint(uint256 _stakingInterval, address _account, uint256 _hint) public view returns (bool) {
    require(_stakingInterval <= staking.currentInterval(), "Staking: Interval out of bounds");

    // Check if hint is correct, else fall back to binary search
    return (
      _hint <= staking.accountSnapshotLength(_account)
      && (_hint == 0 || staking.accountSnapshot(_account, _hint - 1).interval < _stakingInterval)
      && (_hint == staking.accountSnapshotLength(_account) || staking.accountSnapshot(_account, _hint).interval >= _stakingInterval)
    );
  }

  /**
   * @notice Fetch and decompress series of account snapshots
   * @param _startingInterval - starting interval to fetch from
   * @param _endingInterval - interval to fetch to
   * @param _account - account to get snapshot of
   * @param _hint - off-chain computed index of interval
   * @return array of snapshot data
   */
  function fetchAccountSnapshots(
    uint256 _startingInterval,
    uint256 _endingInterval,
    address _account,
    uint256 _hint
  ) public view returns (uint256[] memory) {
    
  }

  /**
   * @notice Earmarks tokens for past intervals
   * @param _token - token to calculate earmarks for
   */
  function earmark(IERC20 _token) public {
    // Check that token is on distribution list
    require(tokens[_token], "GovernorRewards: Token is not on distribution list");

    // Get intervals
    uint256 _currentInterval = currentInterval();
    uint256 _lastEarmarkedInterval = lastEarmarkedInterval[_token];

    // Get token earmarked mapping
    mapping(uint256 => uint256) storage tokenEarmarked = earmarked[_token];

    // Don't process if we haven't advanced at least one interval
    if (_currentInterval > _lastEarmarkedInterval) {
      // Get balance from treasury
      uint256 treasuryBalance = _token.balanceOf(address(treasury));

      // Get distribution amount per interval
      uint256 distributionAmountPerInterval = treasuryBalance * intervalBP / BASIS_POINTS
        / (_currentInterval - _lastEarmarkedInterval);

      // Get total distribution amount
      // We multiply again here instead of using treasuryBalance * intervalBP / BASIS_POINTS
      // to prevent rounding amounts from being lost
      uint256 totalDistributionAmounts = distributionAmountPerInterval * (_currentInterval - _lastEarmarkedInterval);

      // Store earmarked amounts
      for (uint256 i = _currentInterval; i < _currentInterval; i += 1) {
        tokenEarmarked[i] = distributionAmountPerInterval;
      }

      // Transfer tokens
      treasury.transferERC20(_token, address(this), totalDistributionAmounts);
    }
  }

  function calculateRewards(
    IERC20[] calldata _token,
    address _account,
    uint256 _startingInterval,
    uint256 _endingInterval,
    uint256 _startingHint
  ) public returns (uint256) {

  }
}
