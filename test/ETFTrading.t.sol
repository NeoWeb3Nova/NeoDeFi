// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {console} from "forge-std/console.sol";
import {ETFQuoter} from "../src/ETFQuoter.sol";
import {ETFTrading} from "../src/ETFTrading.sol";

contract ETFTradingTest is Test {
    address public constant UNISWAP_V3_SWAP_ROUTER =
        0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E;
    address public constant ETF_QUOTER =
        0xaf0E0FC2F514b0A756377805f94E7B1d7DA70A50;

    address public constant NBTC_TOKEN =
        0xB02956728Ef9B72AdB805a5507024216dD8F0Cba;
    address public constant NETH_TOKEN =
        0x027f8455B1a6df72a49B8364BABaEbf8F38D20Bf;
    address public constant LINK_TOKEN =
        0x028268f8fF62edc596f931E17E2Fb21015f5b0A2;
    address public constant USDC_TOKEN =
        0x45D2b305d3e2C91b0685A3E7c83bF6D201B88aA2;

    // Token decimals
    uint8 public constant NBTC_DECIMALS = 8;
    uint8 public constant NETH_DECIMALS = 18;
    uint8 public constant LINK_DECIMALS = 18;
    uint8 public constant USDC_DECIMALS = 6;

    uint256 public constant NBTC_PER_SHARE = 0.00555869 * 10 ** 8; // 0.00555869 NBTC (~$355.20, 40%)
    uint256 public constant NETH_PER_SHARE = 0.15310345 * 10 ** 18; // 0.15310345 NETH (~$266.40, 30%)
    uint256 public constant LINK_PER_SHARE = 10.96296296 * 10 ** 18; // 10.96296296 LINK (~$88.80, 10%)
    uint256 public constant USDC_PER_SHARE = 177.60 * 10 ** 6; // 177.60 USDC (~$177.60, 20%)

    string public constant ETF_NAME = "Neo ETF";
    string public constant ETF_SYMBOL = "NETF";
    uint256 public constant MIN_MINT_AMOUNT = 1 * 10 ** 18; // Minimum mint amount in ETF shares (1 share with 18 decimals)

    ETFTrading public etfTrading;
    ETFQuoter public etfQuoter;

    address public deployerAddress;
    address public userAddress;
    address public feeCollectorAddress;

    using Strings for uint256;

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

    function mintTokensToUser(
        address _userAddress,
        uint256 _etfShareMultiplier
    ) internal {
        deal(NBTC_TOKEN, _userAddress, (NBTC_PER_SHARE * _etfShareMultiplier));
        deal(NETH_TOKEN, _userAddress, (NETH_PER_SHARE * _etfShareMultiplier));
        deal(LINK_TOKEN, _userAddress, (LINK_PER_SHARE * _etfShareMultiplier));
        deal(USDC_TOKEN, _userAddress, (USDC_PER_SHARE * _etfShareMultiplier));

        console.log("Minted to user:");
        console.log(
            "NBTC: ",
            formatTokenAmount(
                (NBTC_PER_SHARE * _etfShareMultiplier),
                NBTC_DECIMALS
            )
        );
        console.log(
            "NETH: ",
            formatTokenAmount(
                (NETH_PER_SHARE * _etfShareMultiplier),
                NETH_DECIMALS
            )
        );
        console.log(
            "LINK: ",
            formatTokenAmount(
                (LINK_PER_SHARE * _etfShareMultiplier),
                LINK_DECIMALS
            )
        );
        console.log(
            "USDC: ",
            formatTokenAmount(
                (USDC_PER_SHARE * _etfShareMultiplier),
                USDC_DECIMALS
            )
        );
    }

    function approveTokensForETFTrading(
        address _userAddress,
        uint256 _etfShareMultiplier
    ) internal {
        vm.prank(_userAddress);
        ERC20(NBTC_TOKEN).approve(
            address(etfTrading),
            NBTC_PER_SHARE * _etfShareMultiplier
        );
        vm.prank(_userAddress);
        ERC20(NETH_TOKEN).approve(
            address(etfTrading),
            NETH_PER_SHARE * _etfShareMultiplier
        );
        vm.prank(_userAddress);
        ERC20(LINK_TOKEN).approve(
            address(etfTrading),
            LINK_PER_SHARE * _etfShareMultiplier
        );
        vm.prank(_userAddress);
        ERC20(USDC_TOKEN).approve(
            address(etfTrading),
            USDC_PER_SHARE * _etfShareMultiplier
        );

        console.log("User approved ETFTrading to spend their tokens");
    }

    function setUp() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        deployerAddress = vm.addr(privateKey);

        userAddress = makeAddr("userAddress");
        feeCollectorAddress = makeAddr("feeCollectorAddress");

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

        etfTrading = new ETFTrading(
            ETF_NAME,
            ETF_SYMBOL,
            tokenAddresses,
            tokenAmounts,
            MIN_MINT_AMOUNT,
            UNISWAP_V3_SWAP_ROUTER
        );
        console.log("Deployer address:", deployerAddress);
        console.log("ETFTrading deployed at:", address(etfTrading));
    }
}
