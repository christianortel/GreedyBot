import { ERC20 } from '@idecentralize/erclib';
import dotenv from 'dotenv'
dotenv.config()
import { ethers } from 'ethers';
import Oracle from './class/Oracle.js';
import Sequence from './class/Sequence.js';
import Socket from './class/Socket.js';
import Encoder from './class/Encoder.js';

// CHAIN ID
const ETHEREUM = 1;
const POLYGON = 137;

// VERSION
const UNIV2 = 2;

// WEBSOCKET PROVIDERS
const ETH_WS_PROVIDER = process.env.ETH_WS_PROVIDER;
const POLYGON_WS_PROVIDER = process.env.POLYGON_WS_PROVIDER;

// ASSETS ETH
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// ASSET POLYGON
const polyWETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const polyUSDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const polyDAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const polyWMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const PolyWETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";


const ethUniswapV2Factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const polygonQuickSwapFactory = "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32";

// PATH TRADED and target price
// eth
const buyWethAt = 3150;
const sellWethAt = 3300;
const ethPair = [USDC,WETH];
const ethAmountIn = 1; // 
//polygon
const buyWmaticAt = 2.25;
const sellWmaticAt = 2.35;
const polygonPair =[polyDAI,polyWMATIC];
const polyAmountIn = 1; // 

// action
const BUY = true;
const SELL = false;



const ethOracle = new Oracle(
    ETH_WS_PROVIDER,
    ethPair,
    ethAmountIn,
    buyWethAt,
    sellWethAt,
    SELL,       // only for init
    ETHEREUM,
    ethUniswapV2Factory,
    "UniV2",
    UNIV2

)



const polygonOracle = new Oracle(
    POLYGON_WS_PROVIDER,
    polygonPair,
    polyAmountIn,
    buyWmaticAt,
    sellWmaticAt,
    BUY,          // ""
    POLYGON,
    polygonQuickSwapFactory,
    "QuickSwap",
    UNIV2

)

// START THE ORACLES
ethOracle.start()
polygonOracle.start()

// listen for price change
ethOracle.on('changed',() =>{
    logger()
})
polygonOracle.on('changed',() =>{
    logger()
})


// listen for BUY signal
ethOracle.on('buy',() =>{
    
    logger()
})
polygonOracle.on('buy',() =>{
    swap(polygonOracle.amount,polygonOracle.pair,1000,POLYGON,0x123)
    logger()
})

// listen for sell signal
ethOracle.on('sell',() =>{
    logger()
})
polygonOracle.on('sell',() =>{
    logger()
})

// LOG THE PRICE TO CONSOLE
function logger(){
    
    process.stdout.write(  ethOracle.exchange.padEnd(15, ' ') + polygonOracle.exchange.padEnd(15, ' ') + '\n')
    process.stdout.write( 
        ethOracle.color +  ethers.utils.formatUnits(ethOracle.univ2Price, ERC20[ethOracle.chainId][ethPair[0]].decimals).padEnd(15, ' ') + '\x1b[0m' +
        polygonOracle.color +  ethers.utils.formatUnits(polygonOracle.univ2Price, ERC20[polygonOracle.chainId][polygonPair[0]].decimals) + '\x1b[0m' + '\n'
        )
}

// TODO trigger the swap from an event
async function swap(amount,path,minOut,chainId, target){
    const encoder = new Encoder(pulsarSocket.chainId,300000)
    encoder.transferFrom(pathIn[0],process.env.USDC_WMATIC_WALLET,pulsar,pulsarSocket.loanBuffer)
    encoder.approve(pathIn[0],pulsarSocket.exchanges[targetIn],pulsarSocket.amountIn);
    encoder.swapTokensForExactTokens(pulsarSocket.exchanges[targetIn],priceIn,pulsarSocket.amountIn,pathIn,pulsar);
    encoder.approve(pathOut[0],pulsarSocket.exchanges[targetOut],priceIn);
    encoder.swapExactTokensForTokens(pulsarSocket.exchanges[targetOut],priceIn,priceOut,pathOut,pulsar);
    encoder.flashLoanCall();
    pulsarSocket.setPulse(encoder.pulse);
    const call = new Sequence(
      pulsarSocket.txRpc,
      pulsarSocket.pvKey,
      pulsarSocket.pulse,
      pulsarSocket.fees,
      pulsarSocket.loan,
      pulsarSocket.override
    )
    
    try{
        let tx = await call.execute();
        let res = await tx.wait(1)
        if(res){
            pulsarSocket.restart()
        }else{
            pulsarSocket.restart()
        }


    }catch(error){
        pulsarSocket.restart()
    }


}

