import { ERC20 } from '@idecentralize/erclib';
import { ethers } from 'ethers';
import Pulsar from "./Pulsar.js";
import EventEmitter from 'events';

export default class Socket extends EventEmitter {
    constructor(
        greedyContract,
        chainId,
        pvKey,
        override,
        exchanges,
        pathIn,
        pathOut,
        amountIn,
        slippage,
        targetProfit,
        interval,
        readRpc,
        txRpc,
        loan,
        onlyWithdraw

    ) {
        super();
        this.greedyContract = greedyContract;
        this.chainId = chainId;
        this.pvKey = pvKey;
        this.override = override;
        this.exchanges = exchanges;
        this.pathIn = pathIn;
        this.pathOut = pathOut;
        this.amountIn = ethers.utils.parseUnits(amountIn.toString(), ERC20[chainId][pathIn[0]].decimals);
        this.slippage = slippage;
        this.targetProfit = ethers.utils.parseUnits(targetProfit.toString(), ERC20[chainId][pathIn[0]].decimals);
        this.interval = interval;
        this.readRpc = readRpc;
        this.txRpc = txRpc;
        this.loan = loan;
        this.pulse;
        this.pulsar;
        this.onlyWithdraw = onlyWithdraw;
        this.wallet = new ethers.Wallet(pvKey).address;

    }
    
    startSocket() {

        let that = this;
        that.pulsar = new Pulsar(
            that.greedyContract,
            that.chainId,
            that.readRpc,
            that.amountIn,
            that.pathIn,
            that.pathOut,
            that.exchanges,
            that.interval,
            that.onlyWithdraw,
            that.wallet,
            that.targetProfit,
            that.slippage
        );

        that.pulsar.start()

        that.pulsar.on('trade', async (targetIn, targetOut, priceIn, priceOut) => {
            // console.log('Trade Found',targetIn,targetOut,priceIn,priceOut);
            // this event trigger the call encoding
            this.emit('encode', targetIn, targetOut, priceIn, priceOut)

        });

    }

    setCall(pulse) {
        let that = this;
        that.pulse = pulse;
    }

    restart() {
        let that = this;
        that.pulsar.start()
    }


}