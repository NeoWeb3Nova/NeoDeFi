// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {console} from "forge-std/console.sol";
import {ETFQuoter} from "../src/ETFQuoter.sol";
import {FormatUtils} from "../src/libraries/FormatUtils.sol";

contract ETFQuoterTest is Test {
    using Strings for uint256;

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

    using FormatUtils for uint256;

    function setUp() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        deployerAddress = vm.addr(privateKey);

        etfQuoter = new ETFQuoter(UNISWAP_V3_QUOTER);
        console.log("Deployer address:", deployerAddress);
        console.log("ETFQuoter deployed at:", address(etfQuoter));
    }

    function testQuoterFees() public view {
        assertEq(etfQuoter.fees(0), 100);
        assertEq(etfQuoter.fees(1), 500);
        assertEq(etfQuoter.fees(2), 3000);
        assertEq(etfQuoter.fees(3), 10000);
    }

    function testGetAllPaths() public view {
        bytes[] memory paths = etfQuoter.getAllPaths(NBTC_TOKEN, USDC_TOKEN);
        assertEq(paths.length, 4);

        for (uint256 i = 0; i < paths.length; i++) {
            console.log("Path", i, ":", vm.toString(paths[i]));
        }
    }

    function testQuoteExactOut() public view {
        uint256 amountOut = 1 * 10 ** USDC_DECIMALS; // 1 USDC

        console.log(
            "Quoting exact output: %s USDC -> NBTC",
            FormatUtils.formatTokenAmount(amountOut, USDC_DECIMALS)
        );

        try etfQuoter.quoteExactOut(NBTC_TOKEN, USDC_TOKEN, amountOut) returns (
            bytes memory path,
            uint256 amountIn
        ) {
            console.log("Path:", vm.toString(path));
            console.log(
                "NBTC AmountIn:",
                FormatUtils.formatTokenAmount(amountIn, NBTC_DECIMALS)
            );
        } catch (bytes memory reason) {
            console.log("quoteExactOut failed with reason:", string(reason));
        }
    }

    function testQuoteExactIn() public view {
        uint256 amountIn = 1 * 10 ** NBTC_DECIMALS; // 1 NBTC

        console.log(
            "Quoting exact input: %s NBTC -> USDC",
            FormatUtils.formatTokenAmount(amountIn, NBTC_DECIMALS)
        );

        try etfQuoter.quoteExactIn(NBTC_TOKEN, USDC_TOKEN, amountIn) returns (
            bytes memory path,
            uint256 amountOut
        ) {
            console.log("Path:", vm.toString(path));
            console.log(
                "USDC AmountOut:",
                FormatUtils.formatTokenAmount(amountOut, USDC_DECIMALS)
            );
        } catch (bytes memory reason) {
            console.log("quoteExactIn failed with reason:", string(reason));
        }
    }
}
