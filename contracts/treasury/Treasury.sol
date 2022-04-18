// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

// OpenZeppelin v4
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from  "@openzeppelin/contracts/access/Ownable.sol";
import { AccessControl }"@openzeppelin/contracts/access/AccessControl.sol";


/**
 * @title Treasury
 * @author Railgun Contributors
 * @notice Stores treasury funds for Railgun
 */
contract Treasury is Ownable, AccessControl {
  using SafeERC20 for IERC20;
  
  struct Call {
    address to;
    bytes data;
    uint256 value;
  }

  struct Result {
    bool success;
    bytes returnData;
  }

  bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
  bytes32 public constant TRANSACTIONS_ROLE = keccak256("TRANSACTIONS_ROLE");

  /**
   * @notice Sets initial admin
   */
  constructor(address _admin) {
    Ownable.transferOwnership(_admin);
    _setupRole(GOVERNANCE_ROLE, _admin);
  }

  /**
   * @notice Transfers ETH to specified address
   * @param _to - Address to transfer ETH to
   * @param _amount - Amount of ETH to transfer
   */
  function transferETH(address payable _to, uint256 _amount) external {
    require(_to != address(0), "Treasury: Preventing potential accidental burn");
    (bool sent,) = _to.call{value: _amount}("");
    require(sent, "Failed to send Ether");
  }

  /**
   * @notice Transfers ERC20 to specified address
   * @param _token - ERC20 token address to transfer
   * @param _to - Address to transfer tokens to
   * @param _amount - Amount of tokens to transfer
   */
  function transferERC20(IERC20 _token, address _to, uint256 _amount) external {
    require(hasRole(GOVERNANCE_ROLE, msg.sender), "Caller is does not have Governance Role);
    require(_to != address(0), "Treasury: Preventing potential accidental burn");
    _token.safeTransfer(_to, _amount);
  }

    /**
   * @notice Transfers ERC1155 to specified address
   * @param _token - ERC1155 token address to transfer
   * @param _from - Address to transfer tokens to
   * @param _to - Address to transfer tokens to
   * @param _id - token type id
   * @param _amount - Amount of tokens to transfer
   * @param _data - 
   */
  function transferERC1155(IERC1155 _token, address _from, address _to,uint256 _id, uint256 _amount, bytes memory _data) external {
    require(hasRole(GOVERNANCE_ROLE, msg.sender), "Caller is does not have Governance Role);
    require(_to != address(0), "Treasury: Preventing potential accidental burn");
    _token.safeTransferFrom(_from, _to, _id, _amount, _data);
  }

  function callContract(Call[] calldata _calls) public noExternalContract returns (Result[] memory) {
    require(hasRole(GOVERNANCE_ROLE, msg.sender), "Caller is does not have Governance Role);        
    // Call external contract and return
    // solhint-disable-next-line avoid-low-level-calls

    Result[] memory returnData = new Result[](_calls.length);

    for(uint256 i = 0; i < _calls.length; i++) {
      Call calldata call = _calls[i];
      
      (bool success, bytes memory ret) = call.to.call{value: call.value}(call.data);
      require(success, "Call Failed");
      returnData[i] = Result(success, ret);
    }

    return returnData;
  }

  function addTransactionRole(address userAddress) public noExternalContract {
    require(hasRole(GOVERNANCE_ROLE, msg.sender), "Caller is does not have Governance Role);      
    grantRole(TRANSACTIONS_ROLE, userAddress);
  }

  function removeTransactionRole(address userAddress) public noExternalContract {
    require(hasRole(GOVERNANCE_ROLE, msg.sender), "Caller is does not have Governance Role);        
    revokeRole(TRANSACTIONS_ROLE, userAddress);
  }

  /**
  /**
   * @notice Recieve ETH
   */
  // solhint-disable-next-line no-empty-blocks
  fallback() external payable {}

  /**
   * @notice Receive ETH
   */
  // solhint-disable-next-line no-empty-blocks
  receive() external payable {}
}
