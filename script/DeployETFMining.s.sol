// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {MockToken} from "../src/mock/MockToken.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {ETFMining} from "../src/ETFMining.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DeployETFTokens is Script {
    using stdJson for string;
    using Strings for address;
    using SafeERC20 for MockToken;

    string rewardTokenName = "NeoETF Reward Token";
    string rewardTokenSymbol = "NRWD";
    uint256 initialMiningSpeedPerSecond = 1e16; // 每秒挖矿速度，单位为NRWD
    address public constant ETF_TRADING_ADDRESS = 0xdfC341839D4d446c75999B089307f4a618261EE8; // 替换为实际的ETF交易合约地址

    address public etfTradingAddress;
    address public rewardTokenAddress;
    address public miningContractAddress;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);
        console.log("Deployer Address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        MockToken rewardToken = new MockToken(rewardTokenName, rewardTokenSymbol, 18);
        rewardTokenAddress = address(rewardToken);
        console.log("Reward Token deployed at:", rewardTokenAddress);

        rewardToken.mint(deployerAddress, 10_000_000 * 10 ** 18); // Mint 10 million tokens to deployer
        ETFMining miningContract = new ETFMining(rewardTokenAddress, ETF_TRADING_ADDRESS, initialMiningSpeedPerSecond);
        miningContractAddress = address(miningContract);
        console.log("Mining Contract deployed at:", miningContractAddress);

        rewardToken.safeTransfer(miningContractAddress, 10_000_000 * 10 ** 18); // Transfer tokens to mining contract

        vm.stopBroadcast();

        console.log("Deployment complete. Saving addresses to JSON...");
        string memory json = string(
            abi.encodePacked(
                "{\n",
                '  "rewardToken": "',
                rewardTokenAddress.toHexString(),
                '",\n',
                '  "miningContract": "',
                miningContractAddress.toHexString(),
                '"\n      }'
            )
        );
        string memory filePath = "./deployments/etfMiningDeployment.json";
        json.write(filePath);
        console.log("Addresses saved to:", filePath);
    }
}
