pragma solidity ^0.8.0;
pragma abicoder v2;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { feeDistribution } from "../../treasury/FeeDistribution.sol";

contract feeDistributionStub is feeDistribution {
    function initializeFeeDistributionStub(address _admin, uint256 _startingTimestamp, uint256 _lastProcessedInterval, address _stakingContract, address _treasuryContract) external initializer {
      OwnableUpgradeable.__Ownable_init();
      FeeDistribution.initializeFeeDistribution(_admin, _startingTimestamp, _lastProcessedInterval, _stakingContract, _treasuryContract);
    }


    
}