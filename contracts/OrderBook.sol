// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./ViaductCore.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title VIA order book contract
/// @author Asher Wrobel
/// @notice Exchanges between VIA, an signature-based token, and any ERC20 token.
contract OrderBook {
    /// === INITIALIZATION ===

    constructor(IERC20 _standardToken) {
        standardToken = _standardToken;
    }

    /// === PAIR INFO ===
    
    ViaductCore signatureToken;
    IERC20 standardToken;

    /// === ACCOUNTING ===

    struct Order {
        uint256 orderSize;
        address origin;
        uint256 id;
    }
    
    uint256 tickSize;
    mapping(uint256 => Order[]) orders;
    
    /// === TRADING ===

    /// @notice Swaps onto the Viaduct network.
    function swapOn(uint256 _tick, uint256 _amountIn) public {
        Order memory order;
        /// Multiply by _tick/100 to convert to VIA amount
        order.orderSize = _amountIn * (_tick / 100);
        require(order.orderSize > 0, "Order too small.");
        order.origin = msg.sender;
        order.id = block.timestamp;
        standardToken.transferFrom(msg.sender, address(this), _amountIn);
        orders[_tick].push(order);
    }

    /// @notice Prepares transfer hashes.
    function prepareTransfers(uint256 _tick, uint256 _amountIn, uint256 _nonce) public view returns (bytes32[16] memory hashes, uint256[16] memory ids, uint256 quote, uint256[16] memory nonces) {
        uint256 unfulfilledBalance = _amountIn;
        uint256 currentNonce = _nonce;
        uint256 nextIndex = 0;
        for(uint i; i < orders[_tick].length; i++) {
            if(orders[_tick][i].orderSize <= unfulfilledBalance) {
                bytes32 hash = signatureToken.getValidHash(msg.sender, orders[_tick][i].origin, orders[_tick][i].orderSize, currentNonce);
                hashes[nextIndex] = hash;
                nextIndex++;
                ids[nextIndex] = orders[_tick][i].id;
                nonces[orders[_tick][i].id] = currentNonce;
                currentNonce++;
                if(unfulfilledBalance == 0) {
                    quote = _amountIn;
                    break;
                }
            }
        }
        quote = _amountIn - unfulfilledBalance;
    }

    /// @notice Swaps off of the Viaduct network
    function swapOff(uint256 _tick, uint256[] memory _ids, uint256[] memory _nonces, bytes[] memory _sigs) public {
        bool skipIncrement = false;
        uint256 totalIn = 0;
        for(uint i; i < orders[_tick].length; i++) {
            if(skipIncrement) {
                i--;
                skipIncrement = false;
            }
            uint256 index;
            bool foundIndex = false;
            for(uint j; j < _ids.length; j++) {
                if(_ids[j] == orders[_tick][i].id) {
                    index = i;
                    foundIndex = true;
                    break;
                }
            }
            if(!foundIndex) {
                continue;
            }
            signatureToken.objectiveTransfer(msg.sender, orders[_tick][i].origin, orders[_tick][i].orderSize, _sigs[index], _nonces[index]);
            orders[_tick][i] = orders[_tick][orders[_tick].length - 1];
            orders[_tick].pop();
            skipIncrement = true;
        }
        /// Divide by _tick/100 to convert to ERC20 amount
        /// totalIn / (_tick / 100)
        /// Multiply the numerator and denominator both by 100 for the final form:
        /// totalIn * 100 / _tick
        /// This form of the expression is better than the original, because
        /// all division is prefixed by multiplication, which increases
        /// precision.
        uint256 totalOut = totalIn * 100 / _tick;
        standardToken.transfer(msg.sender, totalOut);
    }
}
