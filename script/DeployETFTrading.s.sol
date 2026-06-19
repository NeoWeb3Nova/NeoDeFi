// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {MockToken} from "../src/mock/MockToken.sol";
import {ETFTrading} from "../src/ETFTrading.sol";

// Deploy script:
// forge script script/DeployETFTrading.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY -vv

contract DeployETFTrading is Script {
    address public constant NBTC_TOKEN =
        0xB02956728Ef9B72AdB805a5507024216dD8F0Cba;
    address public constant NETH_TOKEN =
        0x027f8455B1a6df72a49B8364BABaEbf8F38D20Bf;
    address public constant LINK_TOKEN =
        0x028268f8fF62edc596f931E17E2Fb21015f5b0A2;
    address public constant USDC_TOKEN =
        0x45D2b305d3e2C91b0685A3E7c83bF6D201B88aA2;

    address public constant UNISWAP_V3_ROUTER =
        0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E;

    // Token amounts for 1 ETF share ($888 NAV target)
    // NAV target = $888 | 40% BTC / 30% ETH / 10% LINK / 20% USDC
    // Prices used: BTC ≈ $63,900, ETH ≈ $1,740, LINK ≈ $8.10, USDC = $1.00
    uint256 public constant NBTC_PER_SHARE = 0.00555869 * 10 ** 8; // 0.00555869 NBTC (~$355.20, 40%)
    uint256 public constant NETH_PER_SHARE = 0.15310345 * 10 ** 18; // 0.15310345 NETH (~$266.40, 30%)
    uint256 public constant LINK_PER_SHARE = 10.96296296 * 10 ** 18; // 10.96296296 LINK (~$88.80, 10%)
    uint256 public constant USDC_PER_SHARE = 177.60 * 10 ** 6; // 177.60 USDC (~$177.60, 20%)

    string public constant ETF_NAME = "Neo ETF";
    string public constant ETF_SYMBOL = "NETF";
    uint256 public constant MIN_MINT_AMOUNT = 1 * 10 ** 18; // Minimum mint amount in ETF shares (1 share with 18 decimals)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        address[] memory tokenAddresses = new address[](4);
        tokenAddresses[0] = NBTC_TOKEN;
        tokenAddresses[1] = NETH_TOKEN;
        tokenAddresses[2] = LINK_TOKEN;
        tokenAddresses[3] = USDC_TOKEN;

        uint256[] memory tokenAmounts = new uint256[](4);
        tokenAmounts[0] = NBTC_PER_SHARE;
        tokenAmounts[1] = NETH_PER_SHARE;
        tokenAmounts[2] = LINK_PER_SHARE;
        tokenAmounts[3] = USDC_PER_SHARE;

        console.log("Deployer address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);
        // Deploy the ETFTrading contract
        ETFTrading etfTrading = new ETFTrading(
            ETF_NAME,
            ETF_SYMBOL,
            tokenAddresses,
            tokenAmounts,
            MIN_MINT_AMOUNT,
            UNISWAP_V3_ROUTER
        );

        vm.stopBroadcast();

        console.log("ETFTrading deployed at:", address(etfTrading));
    }
}
