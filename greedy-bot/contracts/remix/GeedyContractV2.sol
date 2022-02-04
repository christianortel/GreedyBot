/*SPDX-License-Identifier: MIT


idecentralize.eth
author: ian.dorion.eth

This is the Greedy Bot Contract. REMIX version



**/

import "./FlashLoanReceiverBase.sol";
import "./ILendingPoolAddressesProvider.sol";
import "./IFlashLoanReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

library Sequencer {
  
    struct TradeSequence {
        address[] target;  
        bytes[] callData;  
    }

    struct LoanSequence {
        address[] assets;  
        uint256[] amounts; 
        uint256[] modes;    
    }

}


contract GreedyContract is FlashLoanReceiverBase {

    using SafeERC20 for IERC20;
    using Sequencer for Sequencer.LoanSequence;
    using Sequencer for Sequencer.TradeSequence;

    ILendingPoolAddressesProvider provider;
    address lendingPoolAddr;
    address public owner;
 
    event Sequenced(address user);

    modifier onlyPool() {
        require(msg.sender == lendingPoolAddr, "pool not Paul");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "42");
        _;
    }

    constructor(
        ILendingPoolAddressesProvider _addressProvider,
        address _devAddress
    ) FlashLoanReceiverBase(_addressProvider) {
        owner = _devAddress;
        provider = _addressProvider;
        lendingPoolAddr = provider.getLendingPool();
    }

    /// @notice this function can only be called by the aave lending pool
    /// @param assets an array of all the asset's you borrowed.
    /// @param amounts array of amount's borrowed
    /// @param premiums the fees you have to pay back for each asset
    /// @param initiator The initiator of the loan
    /// @param params Your trade sequence that you built(logic)

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external virtual override onlyPool returns (bool) {
        Sequencer.TradeSequence memory sequence = _decodeTradeSequence(params);
        for (uint256 tid = 0; tid < sequence.target.length; ++tid) {
            _executeCall(sequence.target[tid], sequence.callData[tid]);
        }
        for (uint256 lid = 0; lid < assets.length; ++lid) {
         
            IERC20(assets[lid]).safeApprove(
                lendingPoolAddr,
                amounts[lid] + premiums[lid]
            );
         
        }
   

        emit Sequenced(initiator);

        return true;
    }

    /// @notice Call to make a loan with aave
    /// @param loanData the assets and amounts you want to borrow
    /// @param tradeData the trade sequence encoded into on bytes argument
    /// @param useLoan Bool
    /// @dev

    function executeSequence(
        Sequencer.LoanSequence memory loanData,
        bytes memory tradeData,
        bool useLoan
    ) external onlyOwner {
        ILendingPool _lendingPool = ILendingPool(lendingPoolAddr);
        Sequencer.LoanSequence memory loans = loanData;


        if (useLoan) {
            _lendingPool.flashLoan(
                address(this),
                loans.assets,
                loans.amounts,
                loans.modes,
                msg.sender,
                tradeData,
                0
            );
        } else {
            runSequence(tradeData);
            emit Sequenced(msg.sender);
        }
    }

    function runSequence(bytes memory _sequence) internal {
        Sequencer.TradeSequence memory sequence = _decodeTradeSequence(
            _sequence
        );
        for (uint256 tid = 0; tid < sequence.target.length; ++tid) {
            _executeCall(sequence.target[tid], sequence.callData[tid]);
        }

        emit Sequenced(msg.sender);
    }

    /**
       @dev execute a low level call for any solidity version
       @param target the target the call is made to
       @param callData the data for that call
       @return bool
     */

    function _executeCall(address target, bytes memory callData)
        internal
        returns (bytes memory)
    {
        // no internal rentry
        require(target != address(this), "Internal reentry");
        bool success;
        bytes memory _res;
     
        (success, _res) = target.call(callData);
        if (!success && _res.length > 0) {
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        } else if (!success) {
            revert("VM: executeCall reverted");
        }
        return _res;
    }

    /**
     * @dev Decodes the information encoded for the trade sequence
     * @param params the trade sequence parameter
     * @return TradeSequence struct containing decoded params
     */
    function _decodeTradeSequence(bytes memory params)
        internal
        pure
        returns (Sequencer.TradeSequence memory)
    {
        (
            address[] memory target,
            bytes[] memory callData
        ) = abi.decode(params, (address[], bytes[]) );
        return Sequencer.TradeSequence(target, callData);
    }

    /**
     * @dev Decodes the information encoded for the trade sequence
     * @param params the trade sequence parameter
     * @return TradeSequence struct containing decoded params
     */
    function _decodeLoanSequence(bytes memory params)
        internal
        pure
        returns (Sequencer.LoanSequence memory)
    {
        (
            address[] memory assets,
            uint256[] memory amounts,
            uint256[] memory modes
        ) = abi.decode(params, (address[], uint256[], uint256[]));
        return Sequencer.LoanSequence(assets, amounts, modes);
    }

    ///@notice Sends the funds back to the owner
    ///@param _asset the asset to witthdraw, 0x0000 for ETH/MATIC or other native
    ///@dev will withdraw the balance

    function withdraw(address _asset) external onlyOwner {
        if (_asset == address(0)) {
                 (bool success, ) = payable(owner).call{
            value: address(this).balance
        }("");
        require(success);
        } else {
                IERC20(_asset).safeTransfer(
                    owner,
                    IERC20(_asset).balanceOf(address(this))
                );
        }
    }



}