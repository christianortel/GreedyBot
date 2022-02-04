// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import './IFlashLoanReceiver.sol';
import './ILendingPoolAddressesProvider.sol';
import './ILendingPool.sol';

abstract contract FlashLoanReceiverBase is IFlashLoanReceiver {


  ILendingPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;
  ILendingPool public immutable override LENDING_POOL;

//function  initialize(ILendingPoolAddressesProvider provider) public initializer {
  constructor(ILendingPoolAddressesProvider provider) {
    ADDRESSES_PROVIDER = provider;
    LENDING_POOL = ILendingPool(provider.getLendingPool());
  }
  receive() payable external {}
}