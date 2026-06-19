// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {MockToken} from "../src/mock/MockToken.sol";

// Deploy script: 
// forge script script/DeployETFTokens.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY -vv

contract DeployETFTokens is Script {
    uint8 public constant NBTC_DECIMALS = 8;
    uint8 public constant NETH_DECIMALS = 18;
    uint8 public constant LINK_DECIMALS = 18;
    uint8 public constant USDC_DECIMALS = 6;

    address public nbtcToken;
    address public nethToken;
    address public linkToken;
    address public usdcToken;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        console.log("Deployer address:", deployerAddress);

        vm.startBroadcast();
        nbtcToken = address(
            new MockToken("Mock Token 1", "NBTC", NBTC_DECIMALS)
        );
        console.log("NBTC Token deployed at:", nbtcToken);
        nethToken = address(
            new MockToken("Mock Token 2", "NETH", NETH_DECIMALS)
        );
        console.log("NETH Token deployed at:", nethToken);
        linkToken = address(
            new MockToken("Mock Token 3", "LINK", LINK_DECIMALS)
        );
        console.log("LINK Token deployed at:", linkToken);
        usdcToken = address(
            new MockToken("Mock Token 4", "USDC", USDC_DECIMALS)
        );
        console.log("USDC Token deployed at:", usdcToken);

        nbtcToken.mint(deployerAddress, 100 * 10 ** NBTC_DECIMALS);
        nethToken.mint(deployerAddress, 1000 * 10 ** NETH_DECIMALS);
        linkToken.mint(deployerAddress, 10_000 * 10 ** LINK_DECIMALS);
        usdcToken.mint(deployerAddress, 1_000_000 * 10 ** USDC_DECIMALS);

        vm.stopBroadcast();
    }
}
