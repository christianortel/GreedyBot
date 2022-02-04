'use strict'
import { ethers } from 'ethers';
import fs from 'fs'
import EventEmitter from 'events';
import { ERC20, ROUTER } from '@idecentralize/erclib';

const abiJsonRaw = fs.readFileSync('./abis/full/UniV2.json')
const routerABI = JSON.parse(abiJsonRaw)

export default class Pulsar extends EventEmitter {
    constructor(
        greedyContract,
        chainId,
        rpc,
        amountIn,
        pathIn,
        pathOut,
        targets,
        interval,
        onlyWithdraw,
        wallet,
        targetProfit,
        slippage
    ) {
        super();
        this.greedyContract = greedyContract;
        this.pulsarOn = false;
        this.chainId = chainId;
        this.amountIn = amountIn;
        this.pathIn = pathIn;
        this.pathOut = pathOut;
        this.pathInPriceTarget;
        this.pathOutPriceTarget;
        this.interval = interval;
        this.targets = targets;
        this.intervalID = null;
        this.rpc = rpc;
        this.wallet = wallet;
        this.provider = ethers.getDefaultProvider(rpc);
        this.profitable = false;
        this.onlyWithdraw = onlyWithdraw;
        this.targetProfit = targetProfit;
        this.slippage = slippage;
    }

    async start() {

        let that = this;

        if (that.profitable) {
            this.doNothing()
        }

        if (that.pulsarOn) {
            console.log("Pulsar is already running");
            return
        } else {
            console.log("Greedy🤖 is searching!");
            clearInterval(that.intervalID)
            if (!that.intervalID) {
                that.intervalID = setInterval(await this.runLogic.bind(that), that.interval);

            } else {
                that.intervalID = setInterval(await this.runLogic.bind(that), that.interval);
            }
        }
    }

    async runLogic() {
        let that = this;
        if (that.pulsarOn) {
            return
        }
        that.pulsarOn = true;
        let bestPrice = 0;
        let priceTarget = 0;
        let bestReturn = 0;
        let returnTarget = 0;


        // internal price eval
        function evalPrice(price, targetId, returned) {
            //console.log("evaluating price ", price.toString())

            let formattedPrice = 0;
            let formattedCurrentBest = 0;
            let formattedCurrentBestReturn = 0;

            if(returned){
                   
                formattedPrice = parseFloat(ethers.utils.formatUnits(price,ERC20[that.chainId][that.pathIn[0]].decimals))
                formattedCurrentBestReturn = parseFloat(ethers.utils.formatUnits(bestReturn,ERC20[that.chainId][that.pathIn[0]].decimals))

            }else{
                formattedPrice = parseFloat(ethers.utils.formatUnits(price,ERC20[that.chainId][that.pathIn[1]].decimals))
                formattedCurrentBest = parseFloat(ethers.utils.formatUnits(bestPrice,ERC20[that.chainId][that.pathIn[1]].decimals))
            }
             

            if (!returned) {
        
                if (formattedPrice > formattedCurrentBest) {
                    //console.log("inputPrice price",formattedPrice )
                    bestPrice = price;
                    priceTarget = targetId
                }
            } else {
               // console.log("??????",formattedPrice )
                if (formattedPrice > formattedCurrentBestReturn) {
                   // console.log("OutputPrice price",formattedPrice )
                    bestReturn = price;
                    returnTarget = targetId
                }
            }
        }



        let len = that.targets.length;
        let amountOut = 0;
        let i = 0;


        for (i = 0; i < len; i++) {
            amountOut = await this.getAmountOut(that.targets[i], that.amountIn, that.pathIn, false)
            if (!that.pulsarOn) {
                return
            }
            // eval
            evalPrice(amountOut[1], i, false)
        }

        // The bes price we found after eval
        let bestPriceFound = parseFloat(ethers.utils.formatUnits(bestPrice, ERC20[that.chainId][that.pathIn[1]].decimals))
        //console.log("Best Price Found ", bestPriceFound, " after slippage", bestPriceFound * that.slippage)
        
        // Avoid to many decimals error
        let shortenDecimalsAmount = (bestPriceFound * that.slippage).toFixed(ERC20[that.chainId][that.pathIn[1]].decimals)
        //console.log("pathInPriceTarget", shortenDecimalsAmount )

        // set this class instance bes price found
        that.pathInPriceTarget = ethers.utils.parseUnits(shortenDecimalsAmount.toString(), ERC20[that.chainId][that.pathIn[1]].decimals)
        //check
        //console.log("pathInPriceTarget", that.pathInPriceTarget.toString() )

        let amountReturned = 0;

        for (i = 0; i < len; i++) {                                      
            amountReturned = await this.getAmountOut(that.targets[i], bestPrice, that.pathOut, true)
            if (!that.pulsarOn) {
                return
            }
            //console.log('amount returned',amountReturned[1].toString())
            evalPrice(amountReturned[1], i, true)
        }


        
   
        let bestReturnFound = parseFloat(ethers.utils.formatUnits(bestReturn, ERC20[that.chainId][that.pathOut[1]].decimals))
        console.log("Best Return Found ", bestReturnFound, " after slippage", bestReturnFound * that.slippage)

        let shortenDecimalsAmountReturned = (bestReturnFound * that.slippage).toFixed(ERC20[that.chainId][that.pathOut[0]].decimals)

        //console.log(shortenDecimalsAmountReturned)

        that.pathOutPriceTarget = ethers.utils.parseUnits(shortenDecimalsAmountReturned.toString(ERC20[that.chainId][that.pathOut[1]].decimals), ERC20[that.chainId][that.pathOut[0]].decimals)

        let formattedTargetProfit = parseFloat(ethers.utils.formatUnits(that.targetProfit, ERC20[that.chainId][that.pathIn[0]].decimals))
        let formattedAmountIn = parseFloat(ethers.utils.formatUnits(that.amountIn, ERC20[that.chainId][that.pathIn[0]].decimals))

        let formattedTargetPriceIn = parseFloat(ethers.utils.formatUnits(that.pathInPriceTarget, ERC20[that.chainId][that.pathIn[1]].decimals))
        let formattedTargetPriceOut = parseFloat(ethers.utils.formatUnits(that.pathOutPriceTarget, ERC20[that.chainId][that.pathOut[0]].decimals))

        console.log("Input amount", formattedAmountIn, ERC20[that.chainId][that.pathIn[0]].symbol)
        console.log("Target Price In ", formattedTargetPriceIn, ERC20[that.chainId][that.pathIn[1]].symbol, "from", ROUTER[that.chainId][that.targets[priceTarget]].name)
        console.log("Target return Out", formattedTargetPriceOut, ERC20[that.chainId][that.pathOut[1]].symbol, "from", ROUTER[that.chainId][that.targets[returnTarget]].name)
        console.log("Targeted Profit", formattedTargetProfit, ERC20[that.chainId][that.pathIn[0]].symbol)

        if (formattedTargetPriceOut >= formattedTargetProfit) {
            that.profitable = true;
            clearInterval(that.intervalID)
            this.emit(
                'trade',
                priceTarget,
                returnTarget,
                that.pathInPriceTarget,
                that.pathOutPriceTarget
            )
            console.log("💰 Profitable arbitrage found try to gain");

        } else {
            console.log("😐 No profitable trade found at this time");
            this.restart()
        }

        return
    }

    getAmountOut = async (router, amountIn, path, returned) => {
        let that = this
        const contract = new ethers.Contract(router, routerABI, that.provider);
        let call
        try {
            call = await contract.getAmountsOut(amountIn, path)
        } catch (error) {
            console.log(error)
            that.pulsarOn = false

            return this.start()
        }

        let amount1 = ethers.utils.formatUnits(call[0], ERC20[that.chainId][path[0]].decimals)
        let amount2 = ethers.utils.formatUnits(call[1], ERC20[that.chainId][path[path.length - 1]].decimals)

        if (returned) {
            console.log(
                amount1,
                ERC20[that.chainId][path[0]].symbol,
                "=>",
                amount2,
                ERC20[that.chainId][path[path.length - 1]].symbol,
                "on",
                ROUTER[that.chainId][router].name
            );
        } else {
            console.log(
                amount1,
                ERC20[that.chainId][path[0]].symbol,
                "=>",
                amount2,
                ERC20[that.chainId][path[path.length - 1]].symbol,
                "on",
                ROUTER[that.chainId][router].name
            );
        }

        return call;
    }

    resume() {
        let that = this;
        that.profitable = false;
        return this.start();
    }
    restart() {
        let that = this;
        that.profitable = false;
        that.pulsarOn = false;
        this.start();
        return
    }

    doNothing() {
        //empty function to wait
    }

}

