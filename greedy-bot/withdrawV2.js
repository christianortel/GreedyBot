import dotenv from 'dotenv'
dotenv.config()
import { ethers } from 'ethers';
import fs from 'fs'
const rawGreedyContract = fs.readFileSync('././abis/full/GreedyContract.json');
const GREEDY_ABI = JSON.parse(rawGreedyContract).abi;

// your contract address from env.
const greedyContractAddress = process.env.GREEDY_CONTRACT;

// Your private key
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// THE PROVIDER where do you connect to send transactions
const RPC = process.env.POLYGON_HTTPS_RPC

// ASSETS you want to withdraw
const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";


const provider = new ethers.providers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY,provider);
const greedyBotContract = new ethers.Contract(greedyContractAddress,GREEDY_ABI,wallet)

// Gas settings as per EIP-1559
const gasSettings  = {
    gasLimit: '1000000', 
    maxPriorityFeePerGas: ethers.utils.parseUnits('60.0', 'gwei'), //<-- will help make a trade faster
    maxFeePerGas: ethers.utils.parseUnits('80.0', 'gwei') ,  // <-- should always be grater than max priority
    from: wallet.address
};

    try{
        let tx = await greedyBotContract.withdraw(USDC,gasSettings);
        console.log(tx);
        let res = await tx.wait(1)
        if(res){
            console.log(res)
        }else{
            console.log(res)
        }
    }catch(error){
        console.log("A MAJOR CATASTROPHIC EVENT MUST HAVE OCCURRED!",error)
    }







