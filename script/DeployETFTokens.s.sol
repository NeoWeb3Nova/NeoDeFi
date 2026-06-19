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

    address public nbtcAddress;
    address public nethAddress;
    address public linkAddress;
    address public usdcAddress;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        console.log("Deployer address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);
        MockToken nbtcToken = new MockToken(
            "Mock Token 1",
            "NBTC",
            NBTC_DECIMALS
        );
        nbtcAddress = address(nbtcToken);
        console.log("NBTC Token deployed at:", nbtcAddress);
        MockToken nethToken = new MockToken(
            "Mock Token 2",
            "NETH",
            NETH_DECIMALS
        );
        nethAddress = address(nethToken);
        console.log("NETH Token deployed at:", nethAddress);
        MockToken linkToken = new MockToken(
            "Mock Token 3",
            "LINK",
            LINK_DECIMALS
        );
        linkAddress = address(linkToken);
        console.log("LINK Token deployed at:", linkAddress);
        MockToken usdcToken = new MockToken(
            "Mock Token 4",
            "USDC",
            USDC_DECIMALS
        );
        usdcAddress = address(usdcToken);
        console.log("USDC Token deployed at:", usdcAddress);

        nbtcToken.mint(deployerAddress, 100 * 10 ** NBTC_DECIMALS);
        nethToken.mint(deployerAddress, 1000 * 10 ** NETH_DECIMALS);
        linkToken.mint(deployerAddress, 10_000 * 10 ** LINK_DECIMALS);
        usdcToken.mint(deployerAddress, 1_000_000 * 10 ** USDC_DECIMALS);

        vm.stopBroadcast();
    }
}
