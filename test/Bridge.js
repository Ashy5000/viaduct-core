const {
  loadFixture, time
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("Viaduct Core", function () {
    async function deployFixture() {
        const [owner, dst] = await ethers.getSigners();

        const bridge = await ethers.deployContract("ViaductCore", [true, 0, true]);

        return {owner, bridge, dst};
    }

    it("Should deploy successfully", async function () {
        const { owner, bridge } = await loadFixture(deployFixture);

        expect(bridge).to.not.be.null;
        expect(bridge).to.not.be.undefined;
    });

    it("Should generate correct signature hashes", async function () {
        const { owner, bridge, dst } = await loadFixture(deployFixture);

        const hash = await bridge.getValidHash(owner, dst, 100, 0);

        expect(hash).to.not.be.null;
        expect(hash).to.not.be.undefined;
    });

    it("Should correctly perform objective transfers", async function () {
        const { owner, bridge, dst } = await loadFixture(deployFixture);

        const hash = await bridge.getValidHash(owner, dst, 1, 1);
        const arr = ethers.getBytes(hash);
        const sig = await owner.signMessage(arr);
        const signedMsgHash = await bridge.calculateSignedMessageHash(arr);
        const isValid = await bridge.verify(owner, signedMsgHash, sig);
        await bridge.objectiveTransfer(owner, dst, 1, sig, 1);

        const pendingTransferCount = await bridge.pendingTransferCount();
        expect(pendingTransferCount).to.equal(1);

        await time.increase(3000);

        await bridge.cleanChallengeWindow();

        const cleanedPendingTransferCount = await bridge.pendingTransferCount();
        expect(cleanedPendingTransferCount).to.equal(0);
    })
});
