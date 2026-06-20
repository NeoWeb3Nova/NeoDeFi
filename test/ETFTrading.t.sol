// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {console} from "forge-std/console.sol";
import {ETFQuoter} from "../src/ETFQuoter.sol";
import {ETFTrading} from "../src/ETFTrading.sol";
import {FormatUtils} from "../src/libraries/FormatUtils.sol";

contract ETFTradingTest is Test {
    using FormatUtils for uint256;
    using SafeERC20 for ERC20;
    
    address public constant UNISWAP_V3_SWAP_ROUTER =
        0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E;
    address public constant ETF_QUOTER =
        0xaf0E0FC2F514b0A756377805f94E7B1d7DA70A50;
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

    // Token decimals
    uint8 public constant NBTC_DECIMALS = 8;
    uint8 public constant NETH_DECIMALS = 18;
    uint8 public constant LINK_DECIMALS = 18;
    uint8 public constant USDC_DECIMALS = 6;
    uint8 public constant ETF_DECIMALS = 18;

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
        ERC20(NBTC_TOKEN).forceApprove(
            address(etfTrading),
            NBTC_PER_SHARE * _etfShareMultiplier
        );
        vm.prank(_userAddress);
        ERC20(NETH_TOKEN).forceApprove(
            address(etfTrading),
            NETH_PER_SHARE * _etfShareMultiplier
        );
        vm.prank(_userAddress);
        ERC20(LINK_TOKEN).forceApprove(
            address(etfTrading),
            LINK_PER_SHARE * _etfShareMultiplier
        );
        vm.prank(_userAddress);
        ERC20(USDC_TOKEN).forceApprove(
            address(etfTrading),
            USDC_PER_SHARE * _etfShareMultiplier
        );

        console.log("User approved ETFTrading to spend their tokens");
        console.log(
            "Approved NBTC: ",
            FormatUtils.formatTokenAmount(
                (NBTC_PER_SHARE * _etfShareMultiplier),
                NBTC_DECIMALS
            )
        );
        console.log(
            "Approved NETH: ",
            FormatUtils.formatTokenAmount(
                (NETH_PER_SHARE * _etfShareMultiplier),
                NETH_DECIMALS
            )
        );
        console.log(
            "Approved LINK: ",
            FormatUtils.formatTokenAmount(
                (LINK_PER_SHARE * _etfShareMultiplier),
                LINK_DECIMALS
            )
        );
        console.log(
            "Approved USDC: ",
            FormatUtils.formatTokenAmount(
                (USDC_PER_SHARE * _etfShareMultiplier),
                USDC_DECIMALS
            )
        );
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

        vm.startPrank(deployerAddress);
        etfTrading = new ETFTrading(
            ETF_NAME,
            ETF_SYMBOL,
            tokenAddresses,
            tokenAmounts,
            MIN_MINT_AMOUNT,
            UNISWAP_V3_SWAP_ROUTER
        );

        etfTrading.setFee(feeCollectorAddress, 100, 3000);

        etfQuoter = new ETFQuoter(UNISWAP_V3_QUOTER);

        vm.stopPrank();

        console.log("Deployer address:", deployerAddress);
        console.log("ETFTrading deployed at:", address(etfTrading));
    }

    function testETFMetadata() public view {
        assertEq(etfTrading.name(), ETF_NAME, "ETF name does not match");
        assertEq(etfTrading.symbol(), ETF_SYMBOL, "ETF symbol does not match");
        assertEq(etfTrading.decimals(), 18, "ETF decimals do not match");

        console.log("ETF name:", etfTrading.name());
        console.log("ETF symbol:", etfTrading.symbol());
        console.log("ETF decimals:", etfTrading.decimals());
    }

    function testETFTokens() public view {
        address[] memory tokens = etfTrading.getTokens();

        assertEq(tokens.length, 4, "ETF should have 4 tokens");

        console.log("ETF Tokens:");
        for (uint256 i = 0; i < tokens.length; i++) {
            console.log("Token %d:", i, ERC20(tokens[i]).symbol());
        }
    }

    function testInvestTokenAmounts() public view {
        uint256 testMintAmount = 1 * 10 ** 18; // 1 ETF share
        uint256[] memory amounts = etfTrading.getInvestTokenAmount(
            testMintAmount
        );

        assertEq(amounts.length, 4, "Should return 4 token amounts");

        assertEq(amounts[0], NBTC_PER_SHARE, "NBTC amount does not match");
        assertEq(amounts[1], NETH_PER_SHARE, "NETH amount does not match");
        assertEq(amounts[2], LINK_PER_SHARE, "LINK amount does not match");
        assertEq(amounts[3], USDC_PER_SHARE, "USDC amount does not match");

        console.log("Invest token amounts per share:");
        console.log(
            "NBTC: ",
            FormatUtils.formatTokenAmount(amounts[0], NBTC_DECIMALS)
        );
        console.log(
            "NETH: ",
            FormatUtils.formatTokenAmount(amounts[1], NETH_DECIMALS)
        );
        console.log(
            "LINK: ",
            FormatUtils.formatTokenAmount(amounts[2], LINK_DECIMALS)
        );
        console.log(
            "USDC: ",
            FormatUtils.formatTokenAmount(amounts[3], USDC_DECIMALS)
        );
    }

    function testInvestWithToken() public {
        uint256 etfShareMultiplier = 10; // User will mint 10 ETF shares (ensure enough balance for swap)
        mintTokensToUser(userAddress, etfShareMultiplier);
        approveTokensForETFTrading(userAddress, etfShareMultiplier);

        uint256 mintAmount = 3 * 10 ** 18; // 3 ETF shares
        (uint256 investAmount, bytes[] memory swapPath) = etfQuoter
            .quoteInvestWithToken(address(etfTrading), NBTC_TOKEN, mintAmount);

        console.log(
            "Estimated NBTC amount needed for investing in %d ETF:",
            mintAmount / (10 ** 18),
            FormatUtils.formatTokenAmount(investAmount, NBTC_DECIMALS)
        );

        uint256 maxInvestAmount = (investAmount * 12) / 10; // 20% slippage tolerance

        vm.prank(userAddress);
        etfTrading.investWithToken(
            NBTC_TOKEN,
            userAddress,
            mintAmount,
            maxInvestAmount,
            swapPath
        );
        vm.stopPrank();

        uint256 userEtfBalance = etfTrading.balanceOf(userAddress);
        uint256 expectedEtfBalance = mintAmount -
            (mintAmount * 1000) /
            10000000; // Deducting 0.01% invest fee
        assertEq(
            userEtfBalance,
            expectedEtfBalance,
            "User ETF balance should match the minted amount"
        );

        console.log(
            "User invested %d and received %d ETF shares:",
            userEtfBalance,
            expectedEtfBalance
        );

        uint256 feeCollectorEtfBalance = etfTrading.balanceOf(
            feeCollectorAddress
        );
        uint256 expectedFeeCollectorBalance = (mintAmount * 1000) / 10000000; // 0.01% invest fee
        assertEq(
            feeCollectorEtfBalance,
            expectedFeeCollectorBalance,
            "Fee collector ETF balance should match the invest fee"
        );
    }

    function testRedeemToToken() public {
        testInvestWithToken(); // Ensure the user has ETF shares to redeem

        uint256 userEtfBalanceBeforeRedeem = etfTrading.balanceOf(userAddress);
        console.log(
            "User ETF balance before redeeming:",
            FormatUtils.formatTokenAmount(
                userEtfBalanceBeforeRedeem,
                ETF_DECIMALS
            )
        );

        (uint256 redeemAmountOut, bytes[] memory redeemSwapPath) = etfQuoter
            .quoteRedeemToToken(
                address(etfTrading),
                NBTC_TOKEN,
                userEtfBalanceBeforeRedeem
            );

        console.log(
            "Estimated NBTC amount received for redeeming %s ETF:",
            FormatUtils.formatTokenAmount(
                userEtfBalanceBeforeRedeem,
                ETF_DECIMALS
            ),
            FormatUtils.formatTokenAmount(redeemAmountOut, NBTC_DECIMALS)
        );

        uint256 userNBTCBalanceBeforeRedeem = ERC20(NBTC_TOKEN).balanceOf(
            userAddress
        );
        console.log(
            "User NBTC balance before redeeming:",
            FormatUtils.formatTokenAmount(
                userNBTCBalanceBeforeRedeem,
                NBTC_DECIMALS
            )
        );

        uint256 minRedeemAmount = (redeemAmountOut * 95) / 100; // 5% slippage tolerance
        vm.startPrank(userAddress);
        etfTrading.redeemToToken(
            NBTC_TOKEN,
            userAddress,
            userEtfBalanceBeforeRedeem,
            minRedeemAmount,
            redeemSwapPath
        );
        vm.stopPrank();

        uint256 userEtfBalanceAfterRedeem = etfTrading.balanceOf(userAddress);
        console.log(
            "User ETF balance after redeeming:",
            FormatUtils.formatTokenAmount(
                userEtfBalanceAfterRedeem,
                ETF_DECIMALS
            )
        );
        uint256 userNBTCBalanceAfterRedeem = ERC20(NBTC_TOKEN).balanceOf(
            userAddress
        );
        console.log(
            "User NBTC balance after redeeming:",
            FormatUtils.formatTokenAmount(
                userNBTCBalanceAfterRedeem,
                NBTC_DECIMALS
            )
        );

        assertEq(
            userEtfBalanceAfterRedeem,
            0,
            "User ETF balance should be zero after redeeming all shares"
        );

        assertTrue(
            userNBTCBalanceAfterRedeem >= minRedeemAmount,
            "User NBTC balance after redeeming should be greater than or equal to the minimum redeem amount"
        );

        uint256 receivedNBTCAmount = userNBTCBalanceAfterRedeem -
            userNBTCBalanceBeforeRedeem;
        console.log(
            "NBTC received from redeeming: %s , Expected (quoted) NBTC: %s",
            FormatUtils.formatTokenAmount(receivedNBTCAmount, NBTC_DECIMALS),
            FormatUtils.formatTokenAmount(redeemAmountOut, NBTC_DECIMALS)
        );
        assertApproxEqRel(
            receivedNBTCAmount,
            redeemAmountOut,
            0.01 * 10 ** 18, // 1% tolerance
            "Received NBTC amount should be approximately equal to the quoted amount"
        );
    }
}
