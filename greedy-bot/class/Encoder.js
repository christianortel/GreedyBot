'use strict'
import { ethers } from 'ethers';
import fs from 'fs'
import { ERC20 } from '@idecentralize/erclib';
const rawFlashLoan = fs.readFileSync('././abis/greedy/execute.json');
const rawTransfer = fs.readFileSync('././abis/erc20/transfer.json');
const rawTransferFrom = fs.readFileSync('././abis/erc20/transferFrom.json');
const rawApprove = fs.readFileSync('././abis/erc20/approve.json');
const rawSwapTokensForExactTokens = fs.readFileSync('././abis/univ2/swapTokensForExactTokens.json');
const rawSwapExactTokensForTokens = fs.readFileSync('././abis/univ2/swapExactTokensForTokens.json');

const FLASH_LOAN_ABI = JSON.parse(rawFlashLoan);
const APPROVE_ABI = JSON.parse(rawApprove);
const TRANSFER_FROM_ABI = JSON.parse(rawTransferFrom);
const TRANSFER_ABI = JSON.parse(rawTransfer);
const SWAP_TO_EXACT = JSON.parse(rawSwapTokensForExactTokens);
const SWAP_EXACT_TO = JSON.parse(rawSwapExactTokensForTokens);

export default class Encoder {
    constructor(
        chainId,
        deadline,
        loan
    ) {
        this.chainId = chainId;
        this.callData = [];
        this.targets = [];
        this.value = [];
        this.loanedAssets = [];
        this.loanedAmount = [];
        this.loanMode = [];
        this.pulse;
        this.deadline = deadline;
        this.loan = loan;
    }

    approve(asset, spender, amount) {

        let that = this;
        let iface = new ethers.utils.Interface(JSON.stringify(APPROVE_ABI));
        let sig = "approve(address, uint256)";
        that.targets.push(asset);
        that.callData.push(iface.encodeFunctionData(sig, [spender, amount]));
    }
    transferFrom(asset, from, to, amount) {
        let that = this;
        let iface = new ethers.utils.Interface(JSON.stringify(TRANSFER_FROM_ABI));
        let sig = "transferFrom(address, address, uint256)";
        that.targets.push(asset);
        that.callData.push(iface.encodeFunctionData(sig, [from, to, amount]));
    }
    transfer(asset, to, amount) {
        let that = this;
        let iface = new ethers.utils.Interface(JSON.stringify(TRANSFER_ABI));
        let sig = "transfer(address, uint256)";
        that.targets.push(asset);
        that.callData.push(iface.encodeFunctionData(sig, [to, amount]));
    }
    swapTokensForExactTokens(exchange, amountOut, amountInMax, path, to) {
        console.log('swapTokensForExactTokens', exchange, amountOut, amountInMax, path, to)
        let that = this;
        let deadline = Date.now() + that.deadline;
        let iface = new ethers.utils.Interface(JSON.stringify(SWAP_TO_EXACT));
        let sig = "swapTokensForExactTokens(uint256, uint256, address[], address, uint256)";
        that.targets.push(exchange);
       // console.log(amountOut, amountInMax, path, to, deadline);
        that.callData.push(iface.encodeFunctionData(sig, [amountOut, amountInMax, path, to, deadline]))
    }
    swapExactTokensForTokens(exchange, amountIn, amountOutMin, path, to) {
        console.log('swapExactTokensForTokens',)
        let that = this;
        let deadline = Date.now() + that.deadline;
        let iface = new ethers.utils.Interface(JSON.stringify(SWAP_EXACT_TO));
        let sig = "swapExactTokensForTokens(uint256, uint256, address[], address, uint256)";
        that.targets.push(exchange);
        that.callData.push(iface.encodeFunctionData(sig, [amountIn, amountOutMin, path, to, deadline]))
    }

    packSequence() {
        let that = this;
        let tradeSequence = this.encodeSequence()
        let loanSequence = [that.loanedAssets, that.loanedAmount, that.loanMode]
        let iface = new ethers.utils.Interface(JSON.stringify(FLASH_LOAN_ABI));
        let sig = "executeSequence((address[], uint256[], uint[]), bytes, bool)";
        that.pulse = iface.encodeFunctionData(sig, [loanSequence, tradeSequence, that.loan])
    }

    encodeSequence() {
        let that = this;
        let tradeSequence = ethers.utils.defaultAbiCoder.encode(
            ["address[]", "bytes[]"],
            [that.targets, that.callData]
        )
        return tradeSequence
    }

    borrow(asset, amount, mode) {
        let that = this;
        if (!mode) {
            mode = 0;
        }
        that.loanedAssets.push(asset);
        that.loanedAmount.push(ethers.utils.parseUnits(amount.toString(), ERC20[that.chainId][asset].decimals).toString());
        that.loanMode.push(mode)
    }

}