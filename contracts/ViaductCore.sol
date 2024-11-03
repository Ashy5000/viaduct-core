// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

/// @title Viaduct core contract
/// @author Asher Wrobel
/// @notice This contract can be trustlessly deployed on any EVM chain.
contract ViaductCore {
    // === INITIALIZATION ===

    uint256 constant supply = 10000000000000000000000;

    constructor(bool _isRoot, uint256 _genesisTimestamp, bool _forTesting) {
        if(_isRoot) {
            balances[msg.sender] = supply;
        }
        alwaysCanPropose = _forTesting;
        genesisTimestamp = _genesisTimestamp;
    }

    // === ERC20 ===

    function name() public pure returns (string memory) {
        return "Viaduct";
    }

    function symbol() public pure returns (string memory) {
        return "VIA";
    }
    
    function decimals() public pure returns (uint256) {
        return 18;
    }

    function totalSupply() public pure returns (uint256) {
        return supply;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }

    function transfer(address, uint256) public pure returns (bool) {
        // VIA uses objective transfers only.
        return false;
    }

    function transferFrom(address, address, uint256) public pure returns (bool) {
        // VIA uses objective transfers only.
        return false;
    }

    // === CONSENSUS ===

    /// @notice A transfer recorded by this deployment. Erased after challenge window closes.
    struct Transfer {
        address from;
        address to;
        uint256 amount;
        uint256 nonce;
        uint256 timestamp;
        bool problematic;
    }

    /// @notice Transfers within the challenge window.
    Transfer[] challengeableTransfers;

    /// @notice Beginning of the genesis window.
    uint256 immutable genesisTimestamp;
    /// @notice Length of each challenge window, in seconds.
    uint256 constant challengeWindowLength = 10 * 60;
    /// @notice Length of the proposal period, in seconds.
    uint256 constant proposalLength = 7 * 60;
    /// @notice Length of the challenge-only period, in seconds.
    uint256 constant challengeOnlyLength = 3 * 60;
    /// @notice When set to true, canPropose() always returns true
    bool immutable alwaysCanPropose;

    function canPropose() public view returns (bool) {
        uint256 windowTime = (block.timestamp - genesisTimestamp) % challengeWindowLength;
        return windowTime < proposalLength || alwaysCanPropose;
    }

    function cleanChallengeWindow() public {
        uint256 minTimestamp = block.timestamp - ((block.timestamp - genesisTimestamp) % challengeWindowLength);
        bool increment = true;
        for (uint i; i < challengeableTransfers.length; i++) {
            if(!increment) {
                i--;
            }
            increment = true;
            if(challengeableTransfers[i].timestamp < minTimestamp) {
                if(!challengeableTransfers[i].problematic) {
                    balances[challengeableTransfers[i].from] -= challengeableTransfers[i].amount;
                    balances[challengeableTransfers[i].to] += challengeableTransfers[i].amount;
                }
                challengeableTransfers[i] = challengeableTransfers[challengeableTransfers.length - 1];
                challengeableTransfers.pop();
                increment = false;
            }
        }
    }

    uint[] problematicIndices;
    Transfer[] problematicTransfers;

    function tryChallenge(Transfer memory _conflictingTransfer) public returns (bool) {
        uint256 totalSpent = 0;
        for (uint i; i < challengeableTransfers.length; i++) {
            if(challengeableTransfers[i].from == _conflictingTransfer.from) {
                totalSpent += challengeableTransfers[i].amount;
                problematicTransfers.push(challengeableTransfers[i]);
                problematicIndices.push(i);
            }
        }
        if(balances[_conflictingTransfer.from] > totalSpent) {
            // No conflict.
            return false;
        }
        // Challenge success!
        for (uint i; i < problematicIndices.length; i++) {
            challengeableTransfers[problematicIndices[i]].problematic = true;
        }
        emit ChallengedTransfer(problematicTransfers);
        return true;
    }

    function pendingTransferCount() public view returns (uint256) {
        return challengeableTransfers.length;
    }

    /// @notice Emitted when a transfer causes double-spending. Contains all problematic transfers.
    event ChallengedTransfer(Transfer[] problematicTransfers);

    // === ACCOUNTING ===

    /// @notice Unlocked balances.
    mapping(address => uint256) balances;

    /// @notice A signature-based transfer made by any address. Will relay to adjacent chains.
    event ObjectiveTransfer(address _from, address _to, uint256 _value, bytes _sig, uint256 nonce);


    // === SIGNING ===

    // @notice Calculates the hash of the entire Ethereum Signed Message.
    function calculateSignedMessageHash(bytes32 _messageHash)
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
        );
    }

    // === VERIFICATION ===

    /// @notice Verifies a signature against a message hash
    function verify(
        address _signer,
        bytes32 _hash,
        bytes calldata _signature
    ) public pure returns (bool) {
        return recoverSigner(_hash, _signature) == _signer;
    }

    /// @notice Recovers the signer from a signature.
    function recoverSigner(
        bytes32 _signedMessageHash,
        bytes calldata _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_signedMessageHash, v, r, s);
    }

    /// @notice Splits a signature into r, s, and v.
    function splitSignature(bytes memory sig)
        public
        pure
        returns (bytes32 r, bytes32 s, uint8 v)
    {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if(v < 27) {
            v += 27;
        }
    }

    /// @notice Verifies a signature for a transfer
    function verifyTransfer(
        Transfer memory _transfer,
        bytes calldata _signature
    ) public pure returns (bool) {
        bytes32 messageHash = getValidHash(_transfer.from, _transfer.to, _transfer.amount, _transfer.nonce);
        bytes32 signedMessageHash = calculateSignedMessageHash(messageHash);
        return verify(_transfer.from, signedMessageHash, _signature);
    }


    // === TRANSACTIONS ===

    mapping(uint256 => bool) usedNonces;

    /// @notice Creates a correct message hash given transfer parameters.
    function getValidHash(
        address _from,
        address _to,
        uint256 _value,
        uint256 _nonce
    ) public pure returns (bytes32 messageHash) {
        bytes memory message = abi.encodePacked("Viaduct Signed Message: FROM ", _from, " TO ", _to, " VALUE ", _value, " NONCE ", _nonce);
        messageHash = keccak256(message);
    }

    /// @notice Initiates a transfer relayed across adjacent chains.
    function objectiveTransfer(
        address _from,
        address _to,
        uint256 _value,
        bytes calldata _sig,
        uint256 _nonce
    ) external returns (bool success) {
        require(!usedNonces[_nonce], "Nonce already used.");
        usedNonces[_nonce] = true;
        require(canPropose(), "Cannot propose");
        require(balances[_from] >= _value, "Insufficient balance");
        Transfer memory activeTransfer;
        activeTransfer.from = _from;
        activeTransfer.to = _to;
        activeTransfer.amount = _value;
        activeTransfer.nonce = _nonce;
        activeTransfer.timestamp = block.timestamp;
        require(verifyTransfer(activeTransfer, _sig), "Invalid signature");
        activeTransfer.problematic = false;
        if(tryChallenge(activeTransfer)) {
            activeTransfer.problematic = true;
        }
        challengeableTransfers.push(activeTransfer);
        emit ObjectiveTransfer(_from, _to, _value, _sig, _nonce);
        cleanChallengeWindow();
        success = true;
    }
}
