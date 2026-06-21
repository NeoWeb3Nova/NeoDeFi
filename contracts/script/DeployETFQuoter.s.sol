pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ETFQuoter} from "../src/ETFQuoter.sol";

// Deploy script:
// forge script script/DeployETFQuoter.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY -vv

contract DeployETFQuoter is Script {
    address public constant UNISWAP_V3_QUOTER = 0x43C4147CbaF8eeA99A79F3040E01CC5e6830Cc19;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        console.log("Deployer address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);
        // Deploy the ETFQuoter contract
        address etfQuoter = address(new ETFQuoter(UNISWAP_V3_QUOTER));
        console.log("ETFQuoter deployed at:", etfQuoter);
        vm.stopBroadcast();
    }
}
