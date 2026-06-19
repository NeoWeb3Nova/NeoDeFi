// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {String} from "@openzeppelin/contracts/utils/Strings.sol";

contract ETFQuoterTest is Test {
    using String for uint256;

    address public constant UNISWAP_V3_QUOTER =
        0x43C4147CbaF8eeA99A79F3040E01CC5e6830Cc19;

    address public constant NBTC_TOKEN =
        0xB02956728Ef9B72AdB805a5507024216dD8F0Cba;
    address public constant NETH_TOKEN =
        0x027f8455B1a6df72a49B8364BABaEbf8F38D20Bf;
    address public constant LINK_TOKEN =
        0x028268f8fF62edc596f931E17E2Fb21015f5b0A2;
    address public constant USDC_TOKEN =
        0x45D2b305d3e2C91b0685A3E7c83bF6D201B88aA2;

    ETFQuoter public etfQuoter;

    // Token decimals
    uint8 public constant NBTC_DECIMALS = 8;
    uint8 public constant NETH_DECIMALS = 18;
    uint8 public constant LINK_DECIMALS = 18;
    uint8 public constant USDC_DECIMALS = 6;


    address public deployerAddress;

    function formatTokenAmount(uint256 amount, uint8 decimals) internal pure returns (string memory) {
        return (amount / (10 ** decimals)).toString();
    }

    function setUp() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        deployerAddress = vm.addr(privateKey);

        etfQuoter = new ETFQuoter(UNISWAP_V3_QUOTER);
        console.log("Deployer address:", deployerAddress);
        console.log("ETFQuoter deployed at:", address(etfQuoter));
    }


    function testQuoterFees() public {
        uint24[] memory fees = etfQuoter.fees();
        assertEq(fees.length, 4);
        assertEq(fees[0], 100);
        assertEq(fees[1], 500);
        assertEq(fees[2], 3000);
        assertEq(fees[3], 10000);
    }
}
