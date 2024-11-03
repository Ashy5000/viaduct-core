import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ViaductCoreModule = buildModule("ViaductCoreModule", (m) => {
    const viaductCore = m.contract("ViaductCore", [true, 0, true]);

    return { viaductCore };
});

export default ViaductCoreModule;
