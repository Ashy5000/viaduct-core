const {
  loadFixture, time
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("Viaduct Core", function () {
    async function deployFixture() {
        const [owner, dst] = await ethers.getSigners();

        // const bridge = await ethers.deployContract("ViaductCore", [true, 0, true]);
        const ViaductCore = await ethers.getContractFactory("ViaductCore");
        const bridge = ViaductCore.attach(
            "0x5FbDB2315678afecb367f032d93F642f64180aa3"
        );

        // Upkeep
        await time.increase(600);
        await bridge.cleanChallengeWindow();

        return {owner, bridge, dst};
    }

    it("Should deploy successfully", async function () {
        const { owner, bridge } = await loadFixture(deployFixture);

        expect(bridge).to.not.be.null;
        expect(bridge).to.not.be.undefined;
    });

    it("Should generate correct signature hashes", async function () {
        const { owner, bridge, dst } = await loadFixture(deployFixture);

        const nonce = Math.floor(Math.random() * 10000);

        const hash = await bridge.getValidHash(owner, dst, 100, nonce);

        expect(hash).to.not.be.null;
        expect(hash).to.not.be.undefined;
    });

    it("Should correctly perform objective transfers", async function () {
        const { owner, bridge, dst } = await loadFixture(deployFixture);

        const nonce = Math.floor(Math.random() * 10000);

        const hash = await bridge.getValidHash(owner, dst, 1, nonce);
        const arr = ethers.getBytes(hash);
        const sig = await owner.signMessage(arr);
        const signedMsgHash = await bridge.calculateSignedMessageHash(arr);
        await bridge.objectiveTransfer(owner, dst, 1, sig, nonce);

        const pendingTransferCount = await bridge.pendingTransferCount();
        expect(pendingTransferCount).to.equal(1);

        await time.increase(600);

        await new Promise(resolve => setTimeout(resolve, 10 * 1000));

        const cleanedPendingTransferCount = await bridge.pendingTransferCount();
        expect(cleanedPendingTransferCount).to.equal(0);
    });
});
