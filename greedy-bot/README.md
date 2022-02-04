# greedy-bot

This is the Greedy Bot.

A trading bot that uses a multi-call contract to execute trading strategy that you build in the front end.

The bot was built to be versatile. The contract you will deploy will allow you to use the blockchain in your own way.
Take some classes to learn how to develop your own strategy and push your bot further. 
Submit your strategies to the discord community and win some prize!


# Step 1 - inatall the package

npm install the package with ```npm install```

# step 2 Deploy your multi-call contract 

**AAVE Lending Pool Address Provider**

0xd05e3E715d945B59290df0ae8eF85c1BdB684744


# UPDATE

- The gas settings updated to EIP-1559 have been added to the top of the index file
- The private key from the .env is now named PRIVATE_KEY
- The withdraw method have been improved and the contract will no longer send you the funds after a sequence
- Some slippage was added to let you some margin and accept a smaller amount
- the targeted profit was modified, 1 will trigger a trade for anything greater than the amountIn. 1.03 would be 3% greater

- the ERClib was updated to 1.4.5

