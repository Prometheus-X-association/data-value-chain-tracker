import { describe, it, before, after } from "mocha";
import { expect } from "chai";
import { ethers } from "ethers";
import { setupTestEnvironment, TestEnvironment } from "./setup";
import { IncentiveSigner } from "../../incentive/api/client/lib/IncentiveSigner";
import { waitForTx } from "../helpers/helpers";
import axios from "axios";
import * as fs from "fs";

    const configFilePath = process.env.CONFIG_FILE;
    var configData: any = null;
    if (configFilePath) {
      // Read the content of the JSON file
      configData = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
    } else {
      console.error("Config file path is not set.");
      process.exit(1); // Exit the process with an error code if config file is not found
    }

describe(configData.useCaseName, function(){
    this.timeout(60000);
    let env: TestEnvironment;
    let provider: ethers.JsonRpcProvider;
    let rewardDepositor: ethers.Wallet;
    let incentiveSigner: IncentiveSigner;
    const agents: { [key: string]: ethers.Wallet } = {};
    let agentShares: number[]= [];
    let isOrchestrator: boolean = false;

    const LOCK_DURATION = 24 * 60 * 60; // 1 day lock
    const REWARD_POOL = ethers.parseEther("100");
    const USE_CASE_ID = configData.useCaseName;

    let orchestratorInitialBalance: bigint;
    let orchestratorDepositAmount: bigint;

    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    const wallet = ethers.Wallet.createRandom();
    console.log(wallet);

    configData?.participantShare.map((data: any) =>{
        agents[data.role] = new ethers.Wallet(
            data.participantWallet,
            provider
        );

        if(data.rewardDepositor){
            rewardDepositor = agents[data.role];
            if(data.role === "Orchestrator"){
                isOrchestrator = true;
            }
        }

        agentShares.push(data.numOfShare);
    })

    const agentAddresses = Object.values(agents).map((wallet: ethers.Wallet) => wallet.address);

    before(async () => {
        console.log("before() started");
        try {
            env = await setupTestEnvironment();
    
            // Initialize IncentiveSigner with orchestrator as reward depositor
            incentiveSigner = new IncentiveSigner(
                rewardDepositor.privateKey,
                await env.token.getAddress(),
                provider
            );
    
            await waitForTx(
                env.token.transfer(rewardDepositor.address, ethers.parseEther("2000"))
            );
    
            if (agents["Orchestrator"]) {
                orchestratorInitialBalance = await env.token.balanceOf(
                    agents["Orchestrator"].address
                );
                orchestratorDepositAmount = REWARD_POOL;
            }
        } catch (err) {
            console.error("Error in before hook:", err);
            throw err;
        }
    });
    

    after(async () => {
        console.log("after() started");
        if (env?.apiServer) {
          await env.apiServer.close();
        }
    });

    it("should complete full cycle of" + configData.useCaseName, async function(){
        const participants = agentAddresses;
        const shares = agentShares;
        
        if(rewardDepositor && isOrchestrator){
            await waitForTx(
                env.useCase.connect(rewardDepositor).createUseCase(USE_CASE_ID)
            );
            await waitForTx(
                env.useCase
                  .connect(rewardDepositor)
                  .updateRewardShares(USE_CASE_ID, participants, shares)
            );
        }else{
            await waitForTx(
                env.useCase.connect(agents["Data-Provider"]).createUseCase(USE_CASE_ID)
            );
            await waitForTx(
                env.useCase
                  .connect(agents["Data-Provider"])
                  .updateRewardShares(USE_CASE_ID, participants, shares)
              );
        }
        
    
        console.log(
            "Shares set:",
            await env.useCase.totalRewardShares(USE_CASE_ID)
        );

        for(const obj in agents){
            if(obj.includes('AI-Provider')){
                console.log(
                    "AI Provider share:",
                    (await env.useCase.getParticipantInfo(USE_CASE_ID, agents[obj as keyof typeof agents]))
                      .rewardShare
                );
                  console.log(
                    "AI Provider share:",
                    (await env.useCase.getParticipantInfo(USE_CASE_ID, agents[obj as keyof typeof agents]))
                      .fixedReward
                );
            }
        }


        const signedRequest = await incentiveSigner.createUseCaseDepositRequest(
            USE_CASE_ID,
            env.contracts.useCaseAddress,
            ethers.formatEther(REWARD_POOL)
        );

        const response = await axios.post(
            `${env.apiUrl}/api/incentives/distribute`,
            signedRequest
        );
        expect(response.status).to.equal(200);

        // Wait for the API transaction to be mined
        await provider.waitForTransaction(
        (response.data as { data: { transactionHash: string } }).data
            .transactionHash
        );

        await provider.send("evm_mine", []); // Mine a new block
        await provider.send("evm_mine", []);

        const { totalRewardPool, remainingRewardPool } =
        await env.useCase.useCases(USE_CASE_ID);
        console.log("Total reward pool:", totalRewardPool);
        console.log("Remaining reward pool:", remainingRewardPool);

        if(rewardDepositor && isOrchestrator){
            await waitForTx(env.useCase.connect(rewardDepositor).lockRewards(USE_CASE_ID, LOCK_DURATION))
        }else{
            // 5. Data Provider locks the rewards
            await waitForTx(
                env.useCase.connect(agents['Data-Provider']).lockRewards(USE_CASE_ID, LOCK_DURATION)
            );
        }

        await provider.send("evm_increaseTime", [LOCK_DURATION + 1]);
        await provider.send("evm_mine", []);

       
        for(const obj in agents){
            if(obj !== 'RewardDepositor'){
                await waitForTx(
                    env.useCase.connect(agents[obj as keyof typeof agents]).claimRewards(USE_CASE_ID)
                );
                await provider.send("evm_mine", []);
            }
        }

        type AgentMap = {
            [key: string]: any; // Allows string keys with Wallet type values
        };

        const agentBalances: AgentMap = {};
        const expectedRewards: AgentMap = {};
        var iterator = 0;

        for(const obj in agents){
            if(obj !== 'RewardDepositor'){
                let role: string = obj
                agentBalances[role] = await env.token.balanceOf(agents[obj as keyof typeof agents].address);
                expectedRewards[role] = (REWARD_POOL * BigInt(shares[iterator])) / 10000n;
                iterator = iterator + 1;
            }
        }

        if(rewardDepositor && isOrchestrator){
            agentBalances["Orchestrator"] = agentBalances["Orchestrator"] - (orchestratorInitialBalance - orchestratorDepositAmount);
        }

        console.log(agentBalances);

        for(const obj in agents){
            expect(agentBalances[obj]).to.equal(expectedRewards[obj]);
        }
    })

})