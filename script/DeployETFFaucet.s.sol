// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ETFFaucet} from "../src/ETFFaucet.sol";

// Deploy script:
// forge script script/DeployETFFaucet.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY -vv

contract DeployETFFaucet is Script {
    address public faucetContractAddress;

    address public constant NBTC_ADDRESS = 0xB02956728Ef9B72AdB805a5507024216dD8F0Cba; 
    address public constant NETH_ADDRESS = 0x027f8455B1a6df72a49B8364BABaEbf8F38D20Bf; 
    address public constant LINK_ADDRESS = 0x028268f8fF62edc596f931E17E2Fb21015f5b0A2; 
    address public constant USDC_ADDRESS = 0x45D2b305d3e2C91b0685A3E7c83bF6D201B88aA2;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deployer Address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        // 部署ETFFaucet合约
        ETFFaucet faucetContract = new ETFFaucet(NBTC_ADDRESS, NETH_ADDRESS, LINK_ADDRESS, USDC_ADDRESS);
        faucetContractAddress = address(faucetContract);
        console.log("Faucet Contract deployed at:", faucetContractAddress);

        vm.stopBroadcast();
    }
}
