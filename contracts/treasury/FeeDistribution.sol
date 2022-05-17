// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

// OpenZeppelin v4
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from  "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";

interface staking {
  function globalsSnapshot(uint256 _index) external view returns (GlobalsSnapshot memory);
  function accountSnapshot(address _account, uint256 _index) external view returns (AccountSnapshot memory);
}

/**
 * @title FeeDistribution
 * @author Railgun Contributors
 * @notice Distrubtes Fee funds for Railgun
 */
contract FeeDistribution is Initializable, OwnableUpgradeable {
    using BitMaps for BitMaps.BitMap;
    using SafeERC20 for IERC20;

    uint256 public constant SNAPSHOT_INTERVAL = 14 days;

    struct GlobalsSnapshot {
      uint256 interval;
      uint256 totalVotingPower;
      uint256 totalStaked;
    }

    struct AccountSnapshot {
      uint256 interval;
      uint256 votingPower;
    }

    address public stakingContract;
    address public treasuryContract;

    
    uint256 public startingTimestamp;
    uint256 public lastProcessedInterval;
    uint256 public currentInterval;
    mapping(address => address)public claimableTokens;
    mapping(address => mapping(uint256 => uint256)) public earmarked;

    uint256 claimBP = 420; //Get
    uint256 BASIS_POINTS = 10000; //Get

    // User Address -> Token address/BitMap
    mapping(address => mapping(address => BitMaps.BitMap)) private userTokenClaimTracker;

    /**
   * @notice Sets initial admin
   */
    function initializeFeeDistribution (address _admin, uint256 _startingTimestamp, uint256 _lastProcessedInterval, address _stakingContract, address _treasuryContract) internal initializer  {
        Ownable.transferOwnership(_admin);
        startingTimestamp = _startingTimestamp;
        lastProcessedInterval = _lastProcessedInterval;
        stakingContract = _stakingContract;
        treasuryContract = _treasuryContract;
    }

    function calculateEarmarked(address _token) internal {
      IERC20 token = IERC20(_token);
      if (lastProcessedInterval < currentInterval) {
        for (uint256 i = lastProcessedInterval; i < currentInterval; i.add(1)) {
          uint256 earmarkAmount = token.balanceOf(treasuryContract) * claimBP / BASIS_POINTS;
          //Toadd - Transfer from treasury to this contract 
          earmarked[token][i] = earmarkAmount;
        }
      }
    }

    function calculateRewardsForInterval(address _token, uint256 _interval, address _userAddress) internal{
      if(userTokenClaimTracker[_userAddress][_token][_interval] == 0){
        staking accessSnapshots = staking(stakingContract);
        AccountSnapshot accountSnapshot = accessSnapshots.accountSnapshot(_userAddress, _interval);
        GlobalsSnapshot globalSnapshot = accessSnapshots.globalsSnapshot(_interval);
        uint256 earmarkedTotal = earmarked[_token][_interval];

        userTokenClaimTracker[_userAddress][_token][_interval] = 1;

        return earmarkedTotal.mul(accountSnapshot.votingPower).div(globalSnapshot.totalVotingPower);
      }
      else {
        return 0;
      }
    }

    function calculateRewardsForToken(address _token, uint256 _startInterval, uint256 _endInterval, address _userAddress) internal{
      uint256 total = 0;
      for (uint256 i = _startInterval; i < _endInterval; i.add(1)){
        total = total.add(calculateRewardsForInterval(_token, i, _userAddress));
      }
      return total;
    }
    
    function payoutRewardsForToken(address _token, uint256 _startInterval, uint256 _endInterval, address _userAddress) public noExternalContract {
      IERC20 token = IERC20(_token);
      uint256 amount = calculateRewardsForToken(_token, _startInterval, _endInterval, _userAddress);

      //TOADD check amount is above min
      token.transfer(_userAddress,amount);
    }

    function multiClaimPayout(address[] _tokens, uint256 _startInterval, uint256 _endInterval, address _userAddress) external {
      for(uint256 i = 0; i<_tokens.length; i.add(1)){
        payoutRewardsForToken(_tokens[i], _startInterval, _endInterval,_userAddress);
      }
    }

    // ADD OWNER ONLY
    function addToken(address _token) public noExternalContract {
      require(claimableTokens[_token] != _token);
      claimableTokens[_token] = _token;
    }

    // ADD OWNER ONLY 
    function removeToken(address _token) public noExternalContract {
      require(claimableTokens[_token] == _token);
      delete claimableTokens[_token];
    }

    // ADD OWNER ONLY
    function changeStakingAddress(address _contract) public noExternalContract {
      
    }

   /**
   * @notice Blocks calls from external contracts
   */
  modifier noExternalContract () {
    require(
      msg.sender == tx.origin
      || msg.sender == address(this)
      , "FeeDistribution: Caller is external contract"
    );

    _;
  }
}