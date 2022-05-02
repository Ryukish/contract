// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

// OpenZeppelin v4
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from  "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";

/**
 * @title FeeDistribution
 * @author Railgun Contributors
 * @notice Distrubtes Fee funds for Railgun
 */
contract FeeDistribution is Ownable {
    using BitMaps for BitMaps.BitMap;
    using SafeERC20 for IERC20;

    uint256 public constant SNAPSHOT_INTERVAL = 14 days;

    // Snapshots for globals
    struct GlobalsSnapshot {
      uint256 interval;
      uint256 totalVotingPower;
      uint256 totalStaked;
    }

    struct AccountSnapshot {
      uint256 interval;
      uint256 votingPower;
    }
  mapping(address => AccountSnapshot[]) private accountSnapshots;

    GlobalsSnapshot[] private globalsSnapshots;

    address[] public claimableTokens;
    uint256 public startingTimestamp;
    uint256 public lastProcessedInterval;


    // User Address -> Token address/BitMap
    mapping(address => mapping(address => BitMaps.BitMap)) private userTokenClaimTracker;

    /**
   * @notice Sets initial admin
   */
    constructor(address _admin, uint256 _startingTimestamp, uint256 _lastProcessedInterval) {
        Ownable.transferOwnership(_admin);
        startingTimestamp = _startingTimestamp;
        lastProcessedInterval = _lastProcessedInterval;
    }

    //TOADD - function adds token to claimable token array
    function addToken(address _token) public noExternalContract {
        
    }

    function removeToken(address _token) public noExternalContract {

    }

    function calculateRewardsForInterval(address _token, uint256 _interval, address _userAddress) internal{
      if(userTokenClaimTracker[_userAddress][_token][_interval] == 0){
        uint256 accountSnapshot = accountSnapshots[_interval];
        uint256 globalSnapshot = globalSnapshots[_interval];
        uint256 earmarkedTotal = earmarked[_token][_interval];

        userTokenClaimTracker[_userAddress][_token][_interval] = 1;

        return earmarkedTotal.mul(accountSnapshot).div(globalSnapshot);
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