// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {console} from "forge-std/console.sol";
import {ETFQuoter} from "../src/ETFQuoter.sol";
import {ETFTrading} from "../src/ETFTrading.sol";
import {FormatUtils} from "../src/libraries/FormatUtils.sol";

contract ETFTradingTest is Test {
    using FormatUtils for uint256;
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
            FormatUtils.formatTokenAmount(
                (NBTC_PER_SHARE * _etfShareMultiplier),
                NBTC_DECIMALS
            )
        );
        console.log(
            "NETH: ",
            FormatUtils.formatTokenAmount(
                (NETH_PER_SHARE * _etfShareMultiplier),
                NETH_DECIMALS
            )
        );
        console.log(
            "LINK: ",
            FormatUtils.formatTokenAmount(
                (LINK_PER_SHARE * _etfShareMultiplier),
                LINK_DECIMALS
            )
        );
        console.log(
            "USDC: ",
            FormatUtils.formatTokenAmount(
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
