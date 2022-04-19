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


    address[] public claimableTokens;
    uint256 startingTimestamp;
    uint256 lastProcessedInterval;


    // User Address -> Token address/BitMap
    mapping(address => mapping(address => BitMaps.BitMap)) userTokenClaimTracker;

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

    //TOADD - Rewards = Total earmarked * users voting power / total voting power
    function calculateRewards() internal {

    }
    
    //TOADD - Call calculateRewards
    function payOut() external {

    }

    //TOADD - Multi-claim calls payout with an array of tokens to claim from
    function multiClaimPayout() external {

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