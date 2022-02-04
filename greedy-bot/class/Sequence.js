'use strict'
import { ethers } from 'ethers';

export default class Sequence {
    constructor(
        greedyContract,
        rpc,
        privateKey,
        pulse,
        fees,
        loan,
        override
    ) {
        this.greedyContract = greedyContract;
        this.rpc = rpc;
        this.privateKey = privateKey;
        this.provider = new ethers.providers.JsonRpcProvider(rpc);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.loan = loan;
        this.override = override;
        this.signer = this.provider.getSigner(this.wallet.address);
        this.pulse = pulse
        this.fees = fees;
    }

    execute = async () => {
        let that = this;
        console.log('from wallet', that.wallet.address)

        const call = await that.wallet.sendTransaction({
            to: that.greedyContract,
            data: that.pulse,
            from: that.wallet.address,
            maxPriorityFeePerGas: that.override.maxPriorityFeePerGas,
            maxFeePerGas: that.override.maxFeePerGas,
            gasLimit: that.override.gasLimit,
        });

        console.log(call)
        await call.wait(1)

        console.log("Sequence Succeed")

        return true;

    }


}