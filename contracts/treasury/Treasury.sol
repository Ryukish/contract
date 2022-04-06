// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

// OpenZeppelin v4
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from  "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Treasury
 * @author Railgun Contributors
 * @notice Stores treasury funds for Railgun
 */
contract Treasury is Ownable {
  using SafeERC20 for IERC20;
  /**
   * @notice Sets initial admin
   */
  constructor(address _admin) {
    Ownable.transferOwnership(_admin);
  }

  /**
   * @notice Transfers ETH to specified address
   * @param _to - Address to transfer ETH to
   * @param _amount - Amount of ETH to transfer
   */
  function transferETH(address payable _to, uint256 _amount) external onlyOwner {
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
  function transferERC20(IERC20 _token, address _to, uint256 _amount) external onlyOwner {
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
  function transferERC1155(IERC1155 _token, address _from, address _to,uint256 _id, uint256 _amount, bytes memory _data) external onlyOwner {
    require(_to != address(0), "Treasury: Preventing potential accidental burn");
    _token.safeTransferFrom(_from, _to, _id, _amount, _data);
  }


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
