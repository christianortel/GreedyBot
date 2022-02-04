import dotenv from 'dotenv'
dotenv.config()
import { ethers } from 'ethers';
import Sequence from './class/Sequence.js';
import Socket from './class/Socket.js';
import Encoder from './class/Encoder.js';

// set your greedy bot contract address in the ENV
const greedyContract = process.env.GREEDY_CONTRACT

// CAHIN ID
const chainId = 137;

const CatRouter = "0x94930a328162957FF1dd48900aF67B5439336cBD";
const QuickSwap = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";
const SushiSwap = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";
const CometSwap = "0x93bcdc45f7e62f89a8e901dc4a0e2c6c427d9f25";
const ApeSwap = "0xc0788a3ad43d79aa53b09c2eacc313a787d1d607";
const VaultSwap = "0x3a1d87f206d12415f5b0a33e786967680aab4f6d";
const jetSwap = "0x5C6EC38fb0e2609672BDf628B1fD605A523E5923";

// EXCHANGES WE USE
const exchanges = [CatRouter, QuickSwap, SushiSwap, VaultSwap];

// ASSETS
const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

// PATH TRADED

const pathIn = [USDC,WMATIC];
const pathOut = [WMATIC,USDC];
// reversed

// const pathOut = [USDC,WMATIC];
// const pathIn = [WMATIC,USDC];

const amountIn = 2                        /// <--- amount to trade (or borrow)
const interval = 3000;                    /// <--- socket interval
const slippage =  0.997;                  /// <--- slippage .2%  (we accept to receive 2% less than projected)
const targetProfit = amountIn * 1;    /// <--- we are looking for 3% profit on the amount In set to 1 for any profit at all
const loan = false;                       /// <--- flashloans set to true to use the loan
const pvKey = process.env.PRIVATE_KEY;    /// <--- private Key

// See .env file WS to read http to send tx
const wsRpc = process.env.POLYGON_WSS_PROVIDER;
const RPC = process.env.POLYGON_HTTPS_PROVIDER;

// Gas settings as per EIP-1559
const gasSettings  = {
    gasLimit: '6000000',
    maxPriorityFeePerGas:ethers.utils.parseUnits('70.0', 'gwei'), //<-- will help make a trade faster
    maxFeePerGas: ethers.utils.parseUnits('80.0', 'gwei')   // <-- should always be grater than max priority
};

// Start a trading socket
const pulsarSocket = new Socket(
    greedyContract,              
    chainId,
    pvKey,
    gasSettings,
    exchanges, 
    pathIn, 
    pathOut, 
    amountIn, 
    slippage, 
    targetProfit, 
    interval, 
    wsRpc, 
    RPC, 
    loan 
)

pulsarSocket.startSocket()
pulsarSocket.on('encode', async(targetIn,targetOut,priceIn,priceOut) => {

console.log("To Encode",targetIn,targetOut,priceIn,priceOut)
    const encoder = new Encoder(pulsarSocket.chainId,300000,pulsarSocket.loan)

   // THIS IS YOUR SANDBOX
  
   // use loan only if set to true
  if(pulsarSocket.loan){
    encoder.borrow(pathIn[0],pulsarSocket.amountIn);
  }
  
  /* the logic of an encoded call is; 
  
  with the abi of a function we create a call to be executed within the contract as the contract.

  eg;

  encoder.transferFrom( target , from , to, amount);

  notice the extra argument target is where the call is made. the origin of the function we call.
  in this case the target would be the token address because this is where the transfer from function reside.


  encoder.transferFrom( pathIn[0], pulsarSocket.wallet.address, greedyBotContract, pulsarSocket.amountIn)

  notice these funds should be approve by your wallet to be spent by your contract
  it is not ideal as you want to execute a trade. Yet it's a call you can build.

  It preferable to send the funds in your contract and use the withdraw command.
  
  **/
  


    // we must call the token to approve the exchange
    encoder.approve(pathIn[0],pulsarSocket.exchanges[targetIn],pulsarSocket.amountIn);

    // We swap some tokens for an Exact amount that we have in or we will borrow.
    encoder.swapTokensForExactTokens(pulsarSocket.exchanges[targetIn], priceIn, pulsarSocket.amountIn, pathIn, greedyContract);

    // approve the other exchange
    encoder.approve(pathOut[0],pulsarSocket.exchanges[targetOut], priceIn);

    // swap the other way with path out
    encoder.swapExactTokensForTokens(pulsarSocket.exchanges[targetOut], priceIn, priceOut, pathOut, greedyContract);
    
    // we are done.
    // your can build anything here!

    encoder.packSequence();
    pulsarSocket.setCall(encoder.pulse);

    
    const call = new Sequence(
      pulsarSocket.greedyContract,
      pulsarSocket.txRpc,
      pulsarSocket.pvKey,
      pulsarSocket.pulse,
      pulsarSocket.fees,
      pulsarSocket.loan,
      pulsarSocket.override
    )
    
    try{
        let tx = await call.execute();
        console.log(tx)
        let res = await tx.wait(1)
        if(res){
            pulsarSocket.restart()
        }else{
            pulsarSocket.restart()
        }


    }catch(error){
        pulsarSocket.restart()
    }



})



