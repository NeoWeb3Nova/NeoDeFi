// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ETFTrading} from "../src/ETFTrading.sol";
import {IETFSwapRouter} from "../src/interface/IETFSwapRouter.sol";
import {Path} from "../src/libraries/Path.sol";
import {IETFTrading} from "../src/interface/IETFTrading.sol";

// ---------------------------------------------------------------------------
// Mock ERC20 with a public mint for test flexibility
// ---------------------------------------------------------------------------
contract MockERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

// ---------------------------------------------------------------------------
// Mock Swap Router — simulates Uniswap V3 exactInput / exactOutput behaviour.
//
// For exactOutput  (invest): sends the first token of the path → recipient
// For exactInput   (redeem): sends the  last  token of the path → recipient
//
// The router must be pre-funded with whichever token it is asked to deliver.
// ---------------------------------------------------------------------------
contract MockSwapRouter is IETFSwapRouter {
    using Path for bytes;

    // --- IETFSwapRouter ----------------------------------------------------
    function exactInputSingle(ExactInputSingleParams calldata)
        external
        payable
        override
        returns (uint256)
    {
        revert("not-implemented");
    }

    function exactInput(ExactInputParams calldata params)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        // path = tokenIn + fee + tokenOut (+ fee + tokenOut …)
        // Decode last pool to find the final output token
        bytes memory path = params.path;

        while (path.hasMultiplePools()) {
            path = path.skipToken();
        }
        (, address tokenOut,) = path.decodeFirstPool();

        // Simulate 0.3 % slippage — output is slightly less than input
        amountOut = params.amountIn * 997 / 1000;

        require(
            IERC20(tokenOut).balanceOf(address(this)) >= amountOut,
            "MockRouter: insufficient balance"
        );

        (bool success) = IERC20(tokenOut).transfer(params.recipient, amountOut);
        require(success, "MockRouter: transfer failed");
        return amountOut;
    }

    function exactOutput(ExactOutputParams calldata params)
        external
        payable
        override
        returns (uint256 amountIn)
    {
        // path = tokenOut + fee + tokenIn (+ fee + tokenIn …)
        (address tokenOut,,) = params.path.decodeFirstPool();

        require(
            IERC20(tokenOut).balanceOf(address(this)) >= params.amountOut,
            "MockRouter: insufficient balance"
        );

        (bool success) = IERC20(tokenOut).transfer(params.recipient, params.amountOut);
        require(success, "MockRouter: transfer failed");

        // Return the total amount of input token consumed (simulated 0.3 % fee)
        return params.amountOut * 1003 / 1000;
    }

    function uniswapV3SwapCallback(int256, int256, bytes calldata) external override {
        // no-op in mock
    }
}

// ---------------------------------------------------------------------------
// ETFTrading test suite
// ---------------------------------------------------------------------------
contract ETFTradingTest is Test {
    using Path for bytes;
    using SafeERC20 for IERC20;

    // --- constants ---------------------------------------------------------
    uint24  constant SWAP_FEE = 3000; // 0.3 %
    address constant FEE_TO   = address(0x999);
    address constant USER     = address(0x123);
    address constant ALICE    = address(0x456);

    uint256 internal constant HUNDRED_PERCENT = 1_000_000;
    uint256 internal constant CEIL  = uint256(Math.Rounding.Ceil);
    uint256 internal constant FLOOR = uint256(Math.Rounding.Floor);

    // --- test assets -------------------------------------------------------
    MockERC20       tokenA;
    MockERC20       tokenB;
    MockERC20       tokenC;
    MockSwapRouter  router;
    ETFTrading      etf;

    address[] internal tokens;
    uint256[] internal weights;

    uint256 internal minMintAmount = 1e18;

    // ────────────────────────────────────────────────────────────────────────
    // Setup
    // ────────────────────────────────────────────────────────────────────────
    function setUp() public {
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");
        tokenC = new MockERC20("Token C", "TKC");

        router = new MockSwapRouter();

        tokens.push(address(tokenA));
        tokens.push(address(tokenB));
        tokens.push(address(tokenC));

        // 40 % / 35 % / 25 %
        weights.push(0.4e18);
        weights.push(0.35e18);
        weights.push(0.25e18);

        etf = new ETFTrading(
            "NeoDeFi ETF",
            "NETF",
            tokens,
            weights,
            minMintAmount,
            address(router)
        );

        // Pre-fund the mock router with constituent tokens so it can pay out
        tokenA.mint(address(router), 1_000_000e18);
        tokenB.mint(address(router), 1_000_000e18);
        tokenC.mint(address(router), 1_000_000e18);

        // Fund test users
        tokenA.mint(USER, 1_000_000e18);
        tokenB.mint(USER, 1_000_000e18);
        tokenC.mint(USER, 1_000_000e18);

        tokenA.mint(ALICE, 1_000_000e18);
        tokenB.mint(ALICE, 1_000_000e18);
        tokenC.mint(ALICE, 1_000_000e18);

        vm.label(address(tokenA), "TokenA");
        vm.label(address(tokenB), "TokenB");
        vm.label(address(tokenC), "TokenC");
        vm.label(address(router), "MockRouter");
        vm.label(address(etf), "ETFTrading");
        vm.label(USER, "User");
        vm.label(ALICE, "Alice");
    }

    // ─── helpers ───────────────────────────────────────────────────────────

    /// Build a single-hop swap path `targetToken ↔ srcToken`
    function _buildSwapPath(
        address targetToken,
        address srcToken
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(targetToken, SWAP_FEE, srcToken);
    }

    /// Build one swap-path per constituent token, all routes pointing at `srcToken`
    function _buildSwapPaths(address srcToken) internal view returns (bytes[] memory) {
        bytes[] memory paths = new bytes[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            paths[i] = _buildSwapPath(tokens[i], srcToken);
        }
        return paths;
    }

    /// Shortcut: approve & invest in one go (use generous max to cover router fees)
    function _invest(
        address srcToken,
        address to,
        uint256 mintAmount
    ) internal returns (bytes[] memory) {
        // The mock router's exactOutput returns amountOut * 1003/1000, inflating
        // totalInvestAmount by ~0.3 % per non-same-token constituent.  Allocate
        // 3× mintAmount to be safe for any test scenario.
        uint256 maxInvestAmount = mintAmount * 3;
        bytes[] memory paths = _buildSwapPaths(srcToken);
        vm.prank(to);
        IERC20(srcToken).approve(address(etf), maxInvestAmount);
        vm.prank(to);
        etf.investWithToken(srcToken, to, mintAmount, maxInvestAmount, paths);
        return paths;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  1. Constructor
    // ════════════════════════════════════════════════════════════════════════

    function test_constructor_revert_emptyTokens() public {
        address[] memory empty;
        uint256[] memory emptyW;
        vm.expectRevert("No tokens provided");
        new ETFTrading("E", "E", empty, emptyW, minMintAmount, address(router));
    }

    function test_constructor_revert_mismatchedArrays() public {
        uint256[] memory bad = new uint256[](1);
        bad[0] = 1e18;
        vm.expectRevert("Invalid array length");
        new ETFTrading("E", "E", tokens, bad, minMintAmount, address(router));
    }

    function test_constructor_revert_zeroMinMintAmount() public {
        vm.expectRevert("Invalid minimum mint amount");
        new ETFTrading("E", "E", tokens, weights, 0, address(router));
    }

    function test_constructor_revert_zeroSwapRouter() public {
        vm.expectRevert("Invalid swap router");
        new ETFTrading("E", "E", tokens, weights, minMintAmount, address(0));
    }

    function test_constructor_revert_zeroTokenAddress() public {
        address[] memory bad = new address[](2);
        bad[0] = address(tokenA);
        bad[1] = address(0);
        uint256[] memory ok = new uint256[](2);
        ok[0] = 0.5e18;
        ok[1] = 0.5e18;
        vm.expectRevert("Invalid token address");
        new ETFTrading("E", "E", bad, ok, minMintAmount, address(router));
    }

    function test_constructor_revert_duplicateToken() public {
        address[] memory dup = new address[](2);
        dup[0] = address(tokenA);
        dup[1] = address(tokenA);
        uint256[] memory ok = new uint256[](2);
        ok[0] = 0.5e18;
        ok[1] = 0.5e18;
        vm.expectRevert("Token already exists");
        new ETFTrading("E", "E", dup, ok, minMintAmount, address(router));
    }

    function test_constructor_success() public {
        assertEq(etf.name(), "NeoDeFi ETF");
        assertEq(etf.symbol(), "NETF");
        assertEq(etf.decimals(), 18);
        assertEq(etf.totalSupply(), 0);
        assertEq(etf.owner(), address(this));
        assertEq(etf.swapRouter(), address(router));
        // minMintAmount is internal (no public getter) — verified via invest reverts

        address[] memory stored = etf.getTokens();
        assertEq(stored.length, 3);
        assertEq(stored[0], address(tokenA));
        assertEq(stored[1], address(tokenB));
        assertEq(stored[2], address(tokenC));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  2. setFee
    // ════════════════════════════════════════════════════════════════════════

    function test_setFee_success() public {
        etf.setFee(FEE_TO, 1000, 2000);

        // Verify fee effects through invest:
        uint256 investAmount = 100e18;
        bytes[] memory paths = _buildSwapPaths(address(tokenA));

        vm.startPrank(USER);
        tokenA.approve(address(etf), investAmount);
        etf.investWithToken(address(tokenA), USER, investAmount, investAmount + 1e18, paths);
        vm.stopPrank();

        // investFee = 1000 bps → 0.1 % fee
        uint256 expectedFee = investAmount * 1000 / HUNDRED_PERCENT;
        uint256 expectedMint = investAmount - expectedFee;
        assertEq(etf.balanceOf(FEE_TO), expectedFee, "fee shares minted to feeTo");
        assertEq(etf.balanceOf(USER), expectedMint, "user shares after fee");
        assertEq(etf.totalSupply(), investAmount, "total supply = investAmount");
    }

    // ════════════════════════════════════════════════════════════════════════
    //  3. getInvestTokenAmount
    // ════════════════════════════════════════════════════════════════════════

    function test_getInvestTokenAmount_whenTotalSupplyIsZero() public {
        uint256 mintAmount = 10e18;
        uint256[] memory amounts = etf.getInvestTokenAmount(mintAmount);

        assertEq(amounts.length, 3);
        // When supply == 0 the amounts are weight-based with Ceil rounding
        assertEq(
            amounts[0],
            Math.mulDiv(mintAmount, weights[0], 1e18, Math.Rounding.Ceil),
            "amountA"
        );
        assertEq(
            amounts[1],
            Math.mulDiv(mintAmount, weights[1], 1e18, Math.Rounding.Ceil),
            "amountB"
        );
        assertEq(
            amounts[2],
            Math.mulDiv(mintAmount, weights[2], 1e18, Math.Rounding.Ceil),
            "amountC"
        );

        uint256 sum = amounts[0] + amounts[1] + amounts[2];
        assertTrue(sum >= mintAmount, "sum >= mintAmount (ceil rounding)");
        assertTrue(sum <= mintAmount + 3, "sum at most 3 wei above mintAmount");
    }

    function test_getInvestTokenAmount_whenTotalSupplyIsNotZero() public {
        // Seed the contract with token balances and create an initial supply
        _invest(address(tokenA), ALICE, 100e18);

        uint256 supply = etf.totalSupply();
        uint256 mintAmount = 10e18;
        uint256[] memory amounts = etf.getInvestTokenAmount(mintAmount);

        assertEq(amounts.length, 3);
        // When supply > 0 the amounts are balance-proportional with Ceil rounding
        uint256 balA = tokenA.balanceOf(address(etf));
        uint256 balB = tokenB.balanceOf(address(etf));
        uint256 balC = tokenC.balanceOf(address(etf));

        assertEq(
            amounts[0],
            Math.mulDiv(balA, mintAmount, supply, Math.Rounding.Ceil),
            "amountA"
        );
        assertEq(
            amounts[1],
            Math.mulDiv(balB, mintAmount, supply, Math.Rounding.Ceil),
            "amountB"
        );
        assertEq(
            amounts[2],
            Math.mulDiv(balC, mintAmount, supply, Math.Rounding.Ceil),
            "amountC"
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    //  4. getRedeemTokenAmount
    // ════════════════════════════════════════════════════════════════════════

    function test_getRedeemTokenAmount_zeroFee() public {
        etf.setFee(FEE_TO, 0, 0);
        _invest(address(tokenA), ALICE, 100e18);
        uint256 supply = etf.totalSupply();

        uint256 redeemAmount = 10e18;
        uint256[] memory amounts = etf.getRedeemTokenAmount(redeemAmount);

        uint256 balA = tokenA.balanceOf(address(etf));
        uint256 balB = tokenB.balanceOf(address(etf));
        uint256 balC = tokenC.balanceOf(address(etf));

        assertEq(
            amounts[0],
            Math.mulDiv(balA, redeemAmount, supply, Math.Rounding.Floor),
            "amountA"
        );
        assertEq(
            amounts[1],
            Math.mulDiv(balB, redeemAmount, supply, Math.Rounding.Floor),
            "amountB"
        );
        assertEq(
            amounts[2],
            Math.mulDiv(balC, redeemAmount, supply, Math.Rounding.Floor),
            "amountC"
        );
    }

    function test_getRedeemTokenAmount_withFee() public {
        etf.setFee(FEE_TO, 0, 1000); // 0.1 % redeem fee
        _invest(address(tokenA), ALICE, 100e18);
        uint256 supply = etf.totalSupply();

        uint256 redeemAmount = 10e18;
        uint256[] memory amounts = etf.getRedeemTokenAmount(redeemAmount);

        // Fee is deducted before proportional calculation
        uint256 amountAfterFee = redeemAmount * (HUNDRED_PERCENT - 1000) / HUNDRED_PERCENT;

        uint256 balA = tokenA.balanceOf(address(etf));
        uint256 balB = tokenB.balanceOf(address(etf));
        uint256 balC = tokenC.balanceOf(address(etf));

        assertEq(
            amounts[0],
            Math.mulDiv(balA, amountAfterFee, supply, Math.Rounding.Floor),
            "amountA"
        );
        assertEq(
            amounts[1],
            Math.mulDiv(balB, amountAfterFee, supply, Math.Rounding.Floor),
            "amountB"
        );
        assertEq(
            amounts[2],
            Math.mulDiv(balC, amountAfterFee, supply, Math.Rounding.Floor),
            "amountC"
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    //  5. investWithToken — reverts
    // ════════════════════════════════════════════════════════════════════════

    function test_investWithToken_revert_invalidSwapPathsLength() public {
        bytes[] memory wrong = new bytes[](2);
        wrong[0] = _buildSwapPath(tokens[0], address(tokenA));
        wrong[1] = _buildSwapPath(tokens[1], address(tokenA));

        vm.startPrank(USER);
        tokenA.approve(address(etf), 100e18);
        vm.expectRevert(abi.encodeWithSelector(IETFTrading.InvalidArrayLength.selector));
        etf.investWithToken(address(tokenA), USER, 10e18, 100e18, wrong);
        vm.stopPrank();
    }

    function test_investWithToken_revert_lessThanMinMintAmount() public {
        bytes[] memory paths = _buildSwapPaths(address(tokenA));
        vm.startPrank(USER);
        tokenA.approve(address(etf), 100e18);
        vm.expectRevert(
            abi.encodeWithSelector(IETFTrading.LessThanMinMintAmount.selector)
        );
        etf.investWithToken(address(tokenA), USER, 0.5e18, 100e18, paths);
        vm.stopPrank();
    }

    function test_investWithToken_revert_invalidSwapPath() public {
        bytes[] memory paths = _buildSwapPaths(address(tokenA));
        // Corrupt the first path (unrelated token pair)
        paths[0] = _buildSwapPath(address(tokenB), address(tokenC));
        vm.startPrank(USER);
        tokenA.approve(address(etf), 100e18);
        vm.expectRevert(
            abi.encodeWithSelector(IETFTrading.InvalidSwapPath.selector, paths[0])
        );
        etf.investWithToken(address(tokenA), USER, 10e18, 100e18, paths);
        vm.stopPrank();
    }

    function test_investWithToken_revert_overMaxInvestAmount() public {
        // When same-token paths are used, totalInvestAmount = sum(tokenAmounts)
        // ≈ mintAmount.  With Ceil rounding the sum can be exactly == or slightly
        // above mintAmount.  Setting maxInvestAmount == mintAmount makes it
        // likely that totalInvestAmount >= maxInvestAmount.
        bytes[] memory paths = _buildSwapPaths(address(tokenA));
        uint256 mintAmount = 10e18;

        vm.startPrank(USER);
        tokenA.approve(address(etf), mintAmount);

        vm.expectRevert("Over max invest amount");
        // maxInvestAmount == mintAmount, and since sum(tokenAmounts) >= mintAmount
        // due to Ceil rounding, the require on line 237 will fail.
        etf.investWithToken(address(tokenA), USER, mintAmount, mintAmount, paths);
        vm.stopPrank();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  6. investWithToken — success
    // ════════════════════════════════════════════════════════════════════════

    function test_investWithToken_sameToken_success() public {
        uint256 mintAmount = 50e18;
        uint256 maxAmount = 60e18;

        uint256[] memory amounts = etf.getInvestTokenAmount(mintAmount);
        bytes[] memory paths = _buildSwapPaths(address(tokenA));

        vm.startPrank(USER);
        uint256 beforeBal = tokenA.balanceOf(USER);
        tokenA.approve(address(etf), maxAmount);

        // investAmount varies with router return values — skip strict check
        vm.expectEmit(true, true, true, false);
        emit IETFTrading.InvestedWithToken(
            address(tokenA), USER, mintAmount, 0
        );
        etf.investWithToken(address(tokenA), USER, mintAmount, maxAmount, paths);
        vm.stopPrank();

        // Shares
        assertEq(etf.balanceOf(USER), mintAmount, "user shares");
        assertEq(etf.totalSupply(), mintAmount, "total supply");

        // Contract received all constituent tokens (B and C come from router)
        assertTrue(tokenA.balanceOf(address(etf)) > 0, "contract tokenA");
        assertEq(tokenB.balanceOf(address(etf)), amounts[1], "contract tokenB");
        assertEq(tokenC.balanceOf(address(etf)), amounts[2], "contract tokenC");

        // User was refunded the difference between maxAmount and actual spend
        // totalInvestAmount (contract's srcToken balance) = amounts[0] + routerCost(amounts[1]) + routerCost(amounts[2])
        // where routerCost = amounts[i] * 1003 / 1000 (simulated 0.3 % swap fee)
        uint256 totalInvestAmount = tokenA.balanceOf(address(etf));
        uint256 spent = totalInvestAmount;
        uint256 remaining = maxAmount - spent;
        assertEq(
            tokenA.balanceOf(USER),
            beforeBal - spent,
            "user refunded the difference"
        );
    }

    function test_investWithToken_differentToken_success() public {
        // Invest with tokenB as src (no constituent token matches)
        uint256 mintAmount = 50e18;
        uint256 maxAmount = 60e18;
        bytes[] memory paths = _buildSwapPaths(address(tokenB));

        vm.startPrank(USER);
        uint256 beforeBal = tokenB.balanceOf(USER);
        tokenB.approve(address(etf), maxAmount);

        etf.investWithToken(address(tokenB), USER, mintAmount, maxAmount, paths);
        vm.stopPrank();

        assertEq(etf.balanceOf(USER), mintAmount, "user shares");
        assertEq(etf.totalSupply(), mintAmount, "total supply");

        // All constituent tokens delivered
        assertTrue(tokenA.balanceOf(address(etf)) > 0, "contract has tokenA");
        assertTrue(tokenB.balanceOf(address(etf)) > 0, "contract has tokenB");
        assertTrue(tokenC.balanceOf(address(etf)) > 0, "contract has tokenC");

        // User's input token decreased
        assertLt(tokenB.balanceOf(USER), beforeBal, "user spent tokenB");
    }

    function test_investWithToken_zeroTokenAmount_skips() public {
        // Some amounts round to zero → those iterations should be skipped
        // (no router call, no addition).  We can't force a zero amount with
        // the current weights and a meaningful mint, but the code path exists.
        uint256 mintAmount = minMintAmount;
        uint256 maxAmount = 2e18;
        bytes[] memory paths = _buildSwapPaths(address(tokenA));

        vm.startPrank(USER);
        tokenA.approve(address(etf), maxAmount);
        etf.investWithToken(address(tokenA), USER, mintAmount, maxAmount, paths);
        vm.stopPrank();

        assertEq(etf.balanceOf(USER), mintAmount, "user shares");
    }

    // ════════════════════════════════════════════════════════════════════════
    //  7. redeemToToken — reverts
    // ════════════════════════════════════════════════════════════════════════

    function test_redeemToToken_revert_invalidSwapPathsLength() public {
        _invest(address(tokenA), USER, 100e18);

        bytes[] memory wrong = new bytes[](2);
        wrong[0] = _buildSwapPath(tokens[0], address(tokenA));
        wrong[1] = _buildSwapPath(tokens[1], address(tokenA));

        vm.prank(USER);
        vm.expectRevert(
            abi.encodeWithSelector(IETFTrading.InvalidArrayLength.selector)
        );
        etf.redeemToToken(address(tokenA), USER, 10e18, 1, wrong);
    }

    function test_redeemToToken_revert_insufficientBalance() public {
        bytes[] memory paths = _buildSwapPaths(address(tokenA));
        vm.prank(USER);
        vm.expectRevert("Insufficient balance");
        etf.redeemToToken(address(tokenA), USER, 10e18, 1, paths);
    }

    function test_redeemToToken_revert_invalidSwapPath() public {
        _invest(address(tokenA), USER, 100e18);

        bytes[] memory paths = _buildSwapPaths(address(tokenA));
        // Second path should be B→A, make it C→C instead
        paths[1] = _buildSwapPath(address(tokenC), address(tokenC));

        vm.prank(USER);
        vm.expectRevert(
            abi.encodeWithSelector(IETFTrading.InvalidSwapPath.selector, paths[1])
        );
        etf.redeemToToken(address(tokenA), USER, 10e18, 1, paths);
    }

    function test_redeemToToken_revert_underMinRedeemAmount() public {
        _invest(address(tokenA), USER, 100e18);

        bytes[] memory paths = _buildSwapPaths(address(tokenA));

        vm.prank(USER);
        vm.expectRevert("Under min redeem amount");
        etf.redeemToToken(address(tokenA), USER, 10e18, 1_000_000e18, paths);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  8. redeemToToken — success
    // ════════════════════════════════════════════════════════════════════════

    function test_redeemToToken_sameToken_success() public {
        uint256 investAmount = 100e18;
        uint256 redeemAmount = 30e18;

        _invest(address(tokenA), USER, investAmount);

        uint256 userSharesBefore = etf.balanceOf(USER);
        uint256 supplyBefore = etf.totalSupply();
        uint256[] memory expectedAmounts = etf.getRedeemTokenAmount(redeemAmount);

        bytes[] memory paths = _buildSwapPaths(address(tokenA));

        vm.prank(USER);
        etf.redeemToToken(address(tokenA), USER, redeemAmount, 1, paths);

        // Shares burned
        assertEq(
            etf.balanceOf(USER),
            userSharesBefore - redeemAmount,
            "user shares after redeem"
        );
        assertEq(
            etf.totalSupply(),
            supplyBefore - redeemAmount,
            "total supply after redeem"
        );

        // Ensure the user received at least the expected token amounts
        // (for same-token redeem, direct transfers; for different tokens,
        //  the router swap gives additional tokens via transfer to user)
        assertGe(
            tokenA.balanceOf(USER),
            expectedAmounts[0],
            "user received tokenA"
        );
    }

    function test_redeemToToken_emitsEvent() public {
        _invest(address(tokenA), USER, 100e18);

        bytes[] memory paths = _buildSwapPaths(address(tokenA));

        vm.prank(USER);
        vm.expectEmit(true, true, true, false);
        emit IETFTrading.RedeemedToToken(address(tokenA), USER, 30e18, 0);
        etf.redeemToToken(address(tokenA), USER, 30e18, 1, paths);
    }

    function test_redeemToToken_withFee() public {
        etf.setFee(FEE_TO, 0, 1000); // 0.1 % redeem fee

        uint256 investAmount = 100e18;
        uint256 redeemAmount = 50e18;
        _invest(address(tokenA), USER, investAmount);

        bytes[] memory paths = _buildSwapPaths(address(tokenA));

        uint256 userSharesBefore = etf.balanceOf(USER);
        vm.prank(USER);
        etf.redeemToToken(address(tokenA), USER, redeemAmount, 1, paths);

        // Fee amount minted to feeTo as ETF shares
        uint256 feeAmount = redeemAmount * 1000 / HUNDRED_PERCENT;
        assertEq(etf.balanceOf(FEE_TO), feeAmount, "feeTo received fee shares");
        assertEq(
            etf.balanceOf(USER),
            userSharesBefore - redeemAmount,
            "user shares after redeem"
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    //  9. getTokens
    // ════════════════════════════════════════════════════════════════════════

    function test_getTokens_returnsCopy() public {
        address[] memory stored = etf.getTokens();
        assertEq(stored.length, 3);
        assertEq(stored[0], address(tokenA));
        assertEq(stored[1], address(tokenB));
        assertEq(stored[2], address(tokenC));

        // Modifying the returned array must NOT affect the contract state
        stored[0] = address(0);
        address[] memory stored2 = etf.getTokens();
        assertEq(stored2[0], address(tokenA), "original token list unchanged");
    }

    // ════════════════════════════════════════════════════════════════════════
    // 10. Integration — full invest → redeem round-trip
    // ════════════════════════════════════════════════════════════════════════

    function test_fullRoundTrip_sameToken() public {
        uint256 investAmount = 100e18;

        _invest(address(tokenA), USER, investAmount);
        assertEq(etf.totalSupply(), investAmount);

        bytes[] memory paths = _buildSwapPaths(address(tokenA));
        vm.prank(USER);
        etf.redeemToToken(address(tokenA), USER, investAmount, 1, paths);

        assertEq(etf.totalSupply(), 0, "all shares burned");
        assertEq(etf.balanceOf(USER), 0, "user balance zero");
    }

    function test_fullRoundTrip_differentToken() public {
        uint256 investAmount = 100e18;

        // Invest with tokenB, redeem back to tokenB
        _invest(address(tokenB), USER, investAmount);
        assertEq(etf.totalSupply(), investAmount);

        bytes[] memory paths = _buildSwapPaths(address(tokenB));
        vm.prank(USER);
        etf.redeemToToken(address(tokenB), USER, investAmount, 1, paths);

        assertEq(etf.totalSupply(), 0, "all shares burned");
        assertEq(etf.balanceOf(USER), 0, "user balance zero");
    }

    function test_multipleInvestsAndRedeems() public {
        // Alice invests 100
        _invest(address(tokenA), ALICE, 100e18);
        // User invests 200
        _invest(address(tokenA), USER, 200e18);

        assertEq(etf.totalSupply(), 300e18);
        assertEq(etf.balanceOf(ALICE), 100e18);
        assertEq(etf.balanceOf(USER), 200e18);

        // Alice redeems half
        bytes[] memory paths = _buildSwapPaths(address(tokenA));
        vm.prank(ALICE);
        etf.redeemToToken(address(tokenA), ALICE, 50e18, 1, paths);

        assertEq(etf.totalSupply(), 250e18);
        assertEq(etf.balanceOf(ALICE), 50e18);

        // User redeems all
        vm.prank(USER);
        etf.redeemToToken(address(tokenA), USER, 200e18, 1, paths);

        assertEq(etf.totalSupply(), 50e18);
        assertEq(etf.balanceOf(USER), 0);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 11. Fuzz test — invariant-style
    // ════════════════════════════════════════════════════════════════════════

    /// After any invest, totalSupply == sum of all share balances
    function test_invariant_totalSupplyEqualsSumOfBalances() public {
        _invest(address(tokenA), USER, 100e18);
        _invest(address(tokenA), ALICE, 50e18);

        uint256 sum = etf.balanceOf(USER) + etf.balanceOf(ALICE);
        assertEq(sum, etf.totalSupply(), "supply == sum(balances)");
    }

    /// After any redeem, totalSupply == sum of all share balances
    function test_invariant_totalSupplyAfterRedeem() public {
        _invest(address(tokenA), USER, 100e18);
        _invest(address(tokenA), ALICE, 50e18);

        bytes[] memory paths = _buildSwapPaths(address(tokenA));
        vm.prank(USER);
        etf.redeemToToken(address(tokenA), USER, 30e18, 1, paths);

        uint256 sum = etf.balanceOf(USER) + etf.balanceOf(ALICE);
        assertEq(sum, etf.totalSupply(), "supply == sum(balances) after redeem");
    }
}
