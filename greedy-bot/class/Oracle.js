'use strict'
import { ethers } from 'ethers';
import EventEmitter from 'events';
import { ERC20, ROUTER } from '@idecentralize/erclib';
import fs from 'fs'

const rawUniv2Abi = fs.readFileSync('./abis/full/UniV2.json')
const univ2Abi = JSON.parse(rawUniv2Abi)
const IUniswapV2Pair = fs.readFileSync("./abis/full/UniswapV2Pair.json");
const uniV2PairAbi = JSON.parse(IUniswapV2Pair).abi

const IUniswapV3Pair = fs.readFileSync("./abis/full/UniswapV3Pool.json");
const uniV3PairAbi = JSON.parse(IUniswapV3Pair).abi
const IUniswapV2Factory = fs.readFileSync("./abis/full/UniswapV2Factory.json");
const uniV2FactoryAbi = JSON.parse(IUniswapV2Factory).abi
const IUniswapV3Factory = fs.readFileSync("./abis/full/UniswapV3Factory.json");
const uniV3FactoryAbi = JSON.parse(IUniswapV3Factory).abi

const UniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";


const SushiSwap = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

export default class Oracle extends EventEmitter {
    constructor(
        rpc,
        pair,
        amount,
        buyTarget,
        sellTarget,
        action,
        chainId,
        UniswapFactory,
        exchange,
        version
    ) {
        super();
        this.rpc = rpc;
        this.provider = new ethers.providers.WebSocketProvider(rpc);
        this.chainId = chainId;
        this.running = false;
        this.pair = pair;
      
        this.amount = ethers.utils.parseUnits(amount.toString(), ERC20[chainId][pair[0]].decimals),
        this.asset0;
        this.buyTarget = buyTarget;
        this.sellTarget = sellTarget;
        this.nextMove = action;
        this.reverted;
        this.pairContract;
        this.UniswapFactory = UniswapFactory;
        this.univ2Price = 0;
        this.univ2StartingPrice;
        this.univ3Price;
        this.univ3StartingPrice;
        this.version = version;
        this.exchange = exchange;
        this.color = "\x1b[33m";
        
    }

    start = async () => {
        let that = this;
        

        let uniPair;
        if (that.version == 2) {
            const contract = new ethers.Contract(that.UniswapFactory, uniV2FactoryAbi, that.provider);
            uniPair = await contract.getPair(
                ERC20[that.chainId][that.pair[0]].address,
                ERC20[that.chainId][that.pair[1]].address
                )
            that.pairContract = new ethers.Contract(uniPair, uniV2PairAbi, that.provider);
           
            this.getReserves()
        } else if (that.version == 3) {

            // const contract = new ethers.Contract(that.UniswapFactory, uniV3FactoryAbi, that.provider);
            // uniPair = await contract.getPool(that.pair[0], that.pair[1],3000)
            // that.pairContract = new ethers.Contract(uniPair, uniV3PairAbi, that.provider);
        }

       // console.log(uniPair)

        that.pairContract.on("Swap", (caller, amount0In, amount1In, amount0Out, amount1Out, to) => {
            this.getReserves()
            //console.log("EVENT",caller,amount0In,amount1In,amount0Out,amount1Out,to)
        })

    }

    getReserves = async () => {
        let that = this
        const reserve = await that.pairContract.getReserves();
        if(!that.running){
            that.asset0 = await that.pairContract.token0();
           if( that.asset0 != that.pair[0] ){
               that.reverted = true;
           }
        }
        const padding = "1000000000000000000";
        let price;
        let rawPrice;
        if(!that.reverted){
            price = parseFloat(ethers.utils.formatUnits(reserve[0].mul(padding).div(reserve[1]), ERC20[that.chainId][that.pair[0]].decimals))
            rawPrice = reserve[0].mul(padding).div(reserve[1]);
        }else{
            price = parseFloat(ethers.utils.formatUnits(reserve[1].mul(padding).div(reserve[0]), ERC20[that.chainId][that.pair[0]].decimals))
            rawPrice = reserve[1].mul(padding).div(reserve[0]);
        }
        //// trigger event assap
     
        if(price <= that.buyTarget){
            
            this.emit('buy', that.amount, that.pair, rawPrice, that.buyTarget)
        }else if(price >= that.sellTarget){

            this.emit('sell', that.amount, that.pair, rawPrice,that.sellTarget)
        }
       
        let lastPrice = parseFloat(ethers.utils.formatUnits(that.univ2Price, ERC20[that.chainId][that.pair[0]].decimals))
       
         

        let priceChanged = false
       
        if (!that.univ2StartingPrice) {
            that.univ2StartingPrice = rawPrice;
            priceChanged = true;
        }
        if (lastPrice > price) {
            that.color = '\x1b[31m';
            priceChanged = true;
        } else if (lastPrice < price) {
            that.color = "\x1b[32m";
            priceChanged = true;

        } else {
            priceChanged = false;
            return
        }

        that.univ2Price = rawPrice;

        this.emit('changed')
        //console.log(that.exchange + " :" + that.color, price)
        return;
    }






}