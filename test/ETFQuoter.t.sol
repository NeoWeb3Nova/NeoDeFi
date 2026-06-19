// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {console} from "forge-std/console.sol";
import {ETFQuoter} from "../src/ETFQuoter.sol";

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

    /// @notice 把代币最小单位的金额格式化成人类可读的十进制字符串
    /// @dev 例：formatTokenAmount(1234560000, 6) => "1234.56"
    ///      formatTokenAmount(5, 6)               => "0.000005"
    ///      formatTokenAmount(100_000000, 6)       => "100"（整数不带小数点）
    function formatTokenAmount(
        uint256 amount,
        uint8 decimals
    ) internal pure returns (string memory) {
        if (decimals == 0) {
            return amount.toString();
        }

        uint256 unit = 10 ** decimals;
        uint256 integerPart = amount / unit;
        uint256 fractionalPart = amount % unit;

        if (fractionalPart == 0) {
            return integerPart.toString();
        }

        // 先算出去掉末尾 0 之后，小数部分实际需要的位数
        uint8 fracLength = decimals;
        uint256 temp = fractionalPart;
        while (temp % 10 == 0) {
            temp /= 10;
            fracLength--;
        }

        bytes memory intBytes = bytes(integerPart.toString());
        uint256 totalLength = intBytes.length + 1 + fracLength; // +1 是小数点
        bytes memory buffer = new bytes(totalLength);

        // 写整数部分
        for (uint256 i = 0; i < intBytes.length; i++) {
            buffer[i] = intBytes[i];
        }
        buffer[intBytes.length] = ".";

        // 从后往前写有效数字，剩下的前导空位用 0 补齐
        // （比如 fractionalPart=50000, decimals=6 -> 裁剪后是 "05"，
        //  先写出有效数字 "5"，再往前补一个 "0"）
        uint256 sigDigits = fractionalPart / (10 ** (decimals - fracLength));
        uint256 cursor = totalLength;
        while (sigDigits > 0) {
            cursor--;
            buffer[cursor] = bytes1(uint8(48 + (sigDigits % 10)));
            sigDigits /= 10;
        }
        while (cursor > intBytes.length + 1) {
            cursor--;
            buffer[cursor] = "0";
        }

        return string(buffer);
    }

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
            "Quoting exact output: NBTC -> %s USDC",
            formatTokenAmount(amountOut, USDC_DECIMALS)
        );

        try etfQuoter.quoteExactOut(NBTC_TOKEN, USDC_TOKEN, amountOut) returns (
            bytes memory path,
            uint256 amountIn
        ) {
            console.log("Path:", vm.toString(path));
            console.log(
                "NBTC AmountIn:",
                formatTokenAmount(amountIn, NBTC_DECIMALS)
            );
        } catch (bytes memory reason) {
            console.log("quoteExactOut failed with reason:", string(reason));
        } catch {
            console.log("quoteExactOut failed with unknown reason");
        }
    }

    function testQuoteExactIn() public view {
        uint256 amountIn = 1 * 10 ** NBTC_DECIMALS; // 1 NBTC

        console.log(
            "Quoting exact input: %s NBTC -> USDC",
            formatTokenAmount(amountIn, NBTC_DECIMALS)
        );

        try etfQuoter.quoteExactIn(NBTC_TOKEN, USDC_TOKEN, amountIn) returns (
            bytes memory path,
            uint256 amountOut
        ) {
            console.log("Path:", vm.toString(path));
            console.log(
                "USDC AmountOut:",
                formatTokenAmount(amountOut, USDC_DECIMALS)
            );
        } catch (bytes memory reason) {
            console.log("quoteExactIn failed with reason:", string(reason));
        } catch {
            console.log("quoteExactIn failed with unknown reason");
        }
    }
}
