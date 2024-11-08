import { ethers } from "ethers";

import { JsonRpcProvider, Contract } from "ethers";

import cloneDeep from "lodash.clonedeep";

import {Mutex} from "async-mutex";

console.log("℣ℐ₳ᗫน☾† ℭℴℝє");

let provider = new JsonRpcProvider();

// Hardhat local node private key, do not use
let signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

const coreAbi = [{"inputs":[{"internalType":"bool","name":"_isRoot","type":"bool"},{"internalType":"uint256","name":"_genesisTimestamp","type":"uint256"},{"internalType":"bool","name":"_forTesting","type":"bool"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"components":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bool","name":"problematic","type":"bool"}],"indexed":false,"internalType":"struct ViaductCore.Transfer[]","name":"problematicTransfers","type":"tuple[]"}],"name":"ChallengedTransfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"_from","type":"address"},{"indexed":false,"internalType":"address","name":"_to","type":"address"},{"indexed":false,"internalType":"uint256","name":"_value","type":"uint256"},{"indexed":false,"internalType":"bytes","name":"_sig","type":"bytes"},{"indexed":false,"internalType":"uint256","name":"nonce","type":"uint256"}],"name":"ObjectiveTransfer","type":"event"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_messageHash","type":"bytes32"}],"name":"calculateSignedMessageHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"canPropose","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"cleanChallengeWindow","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_value","type":"uint256"},{"internalType":"uint256","name":"_nonce","type":"uint256"}],"name":"getValidHash","outputs":[{"internalType":"bytes32","name":"messageHash","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_value","type":"uint256"},{"internalType":"bytes","name":"_sig","type":"bytes"},{"internalType":"uint256","name":"_nonce","type":"uint256"}],"name":"objectiveTransfer","outputs":[{"internalType":"bool","name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"pendingTransferCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_signedMessageHash","type":"bytes32"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"recoverSigner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes","name":"sig","type":"bytes"}],"name":"splitSignature","outputs":[{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"},{"internalType":"uint8","name":"v","type":"uint8"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bool","name":"problematic","type":"bool"}],"internalType":"struct ViaductCore.Transfer","name":"_conflictingTransfer","type":"tuple"}],"name":"tryChallenge","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_signer","type":"address"},{"internalType":"bytes32","name":"_hash","type":"bytes32"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"verify","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bool","name":"problematic","type":"bool"}],"internalType":"struct ViaductCore.Transfer","name":"_transfer","type":"tuple"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"verifyTransfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"}];

const lock = new Mutex();

const coreAddresses = ["0x5FbDB2315678afecb367f032d93F642f64180aa3"]; // Test address
const contracts = [];
for(let i = 0; i < coreAddresses.length; i++) {
    const core = new Contract(coreAddresses[i], coreAbi, signer);
    const name = await core.name();
    console.log("Retreived contract details:");
    console.log("===========================");
    console.log("Name:", name);
    const symbol = await core.symbol();
    console.log("Symbol:", symbol);
    const decimals = await core.decimals();
    console.log("Decimals:", decimals);
    console.log("===========================");
    console.log("❉ Running initial upkeep...");
    console.log("> ❉ Cleaning challenge windows...");
    for(let j = 0; j < contracts.length; j++) {
        try {
            await contracts[j].cleanChallengeWindow();
        } catch (error) {
            console.log("> × Error cleaning challenge window.")
        }
    }
    console.log("> ✓ Clean!");
    console.log("✓ Initial upkeep complete!")
    if(name != "Viaduct" || symbol != "VIA" || decimals != 18) {
        console.error("× ERROR: ViaductCore details do not match.");
        break;
    } else {
        console.log("✓ ViaductCore details seem to match.")
    }
    core.on("ObjectiveTransfer", async (_from, _to, _value, _sig, _nonce) => {
        const release = await lock.acquire();
        // First, sync.
        console.log("❉ Detected objective transfer, relaying...");
        for(let j = 0; j < contracts.length; j++) {
            try {
                const tx = await contracts[j].objectiveTransfer(_from, _to, _value, _sig, _nonce);
                await tx.wait();
            } catch (error) {
                console.log("• Skipped (repeated nonce).");
            }
        }
        // Then, clean. Not strictly necessary to perform every transfer but helps maintain high TPS.
        console.log("❉ Cleaning challenge windows...");
        for(let j = 0; j < contracts.length; j++) {
            try {
                const tx = await contracts[j].cleanChallengeWindow();
                await tx.wait();
            } catch (error) {
                console.log("× Error cleaning challenge window.")
            }
        }
        console.log("✓ Clean!");
        release();
    });
    let challengedNonces = [];
    core.on("ChallengedTransfer", async (_from, _to, _value, _sig, _nonce) => {
        const release = await lock.acquire();
        // We're using objectiveTransfer() here because it
        // will record transfers in the challengeable
        // window even if they're marked as problematic.
        // This way, we can check not only double-spending,
        // but also triple-spending, quadruple-spending,
        // etc.
        // First, sync.
        console.log("! Transfer challenged !");
        console.log("   ❉ Relaying...");
        for(let j = 0; j < contracts.length; j++) {
            try {
                const tx = await contracts[j].challengeAndRecord(_from, _to, _value, _sig, _nonce);
                await tx.wait();
            } catch (error) {
                console.log("• Skipped (repeated nonce).");
            }
        }
        // Then, clean. Not strictly necessary to perform every challenge but helps maintain high TPS.
        console.log("   ❉ Cleaning challenge windows...");
        for(let j = 0; j < contracts.length; j++) {
            try {
                const tx = await contracts[j].cleanChallengeWindow();
                await tx.wait();
            } catch (error) {
                console.log("× Error cleaning challenge window.")
            }
        }
        console.log("✓ Clean!");
        release();
    });
    contracts.push(core);
}
