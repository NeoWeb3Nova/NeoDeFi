// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ETFMining} from "../src/ETFMining.sol";
import {MockToken} from "../src/mock/MockToken.sol";

contract MockETF is ERC20 {
    constructor() ERC20("Mock ETF", "mETF") {
        _mint(msg.sender, 1_000_000 * 1e18); // Mint 1,000,000 mETF to the deployer
    }
}

contract ETFMiningTest is Test {
    using SafeERC20 for ERC20;
    using SafeERC20 for MockETF;

    ETFMining public etfMining;
    MockToken public rewardToken;
    MockETF public etfToken;

    address public deployerAddress;
    address public alpha;
    address public beta;

    uint256 public constant INITIAL_REWARD_BALANCE = 10_000 * 1e18; // 10,000 reward tokens
    uint256 public constant MINING_SPEED_PER_SECOND = 1 * 1e18; // 1 reward tokens per second

    function setUp() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        deployerAddress = vm.addr(privateKey);

        // Deploy mock reward token and ETF token
        rewardToken = new MockToken("Reward Token", "RWD", 18);
        etfToken = new MockETF();

        // Deploy the ETFMining contract
        etfMining = new ETFMining(address(rewardToken), address(etfToken), MINING_SPEED_PER_SECOND);

        // Fund the ETFMining contract with reward tokens
        rewardToken.mint(address(etfMining), INITIAL_REWARD_BALANCE);

        // Create test user accounts
        alpha = makeAddr("Alpha");
        beta = makeAddr("Beta");

        // Distribute some ETF tokens to users for testing
        etfToken.safeTransfer(alpha, 100 * 1e18); // 100 mETF to Alpha
        etfToken.safeTransfer(beta, 100 * 1e18); // 100 mETF to Beta

        vm.startPrank(alpha);
        etfToken.approve(address(etfMining), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(beta);
        etfToken.approve(address(etfMining), type(uint256).max);
        vm.stopPrank();

        console.log("Deployer address:", deployerAddress);
        console.log("ETFMining deployed at:", address(etfMining));
    }

    function testInitialState() public view {
        // Verify initial state of the contract
        assertEq(etfMining.miningSpeedPerSecond(), MINING_SPEED_PER_SECOND, "Initial mining speed mismatch");
        assertEq(etfMining.totalStackedBalance(), 0, "Initial total staked should be zero");
    }

    function testStake() public {
        uint256 alphaStakeAmount = 50 * 1e18; // Alpha stakes 50 mETF

        vm.startPrank(alpha);
        etfMining.stake(alphaStakeAmount);
        vm.stopPrank();

        assertEq(etfMining.totalStackedBalance(), 50 * 1e18, "Total staked should be 50 mETF");
        assertEq(etfMining.supplierStackedBalance(alpha), 50 * 1e18, "Alpha's stake should be 50 mETF");
        assertEq(etfToken.balanceOf(alpha), 50 * 1e18, "Alpha's remaining ETF balance should be 50 mETF");
    }

    function testUnstake() public {
        uint256 alphaStakeAmount = 50 * 1e18; // Alpha stakes 50 mETF
        uint256 alphaUnstakeAmount = 20 * 1e18; // Alpha unstakes 20 mETF
        uint256 alphaEtfBalanceBefore = etfToken.balanceOf(alpha);

        vm.startPrank(alpha);
        etfMining.stake(alphaStakeAmount);
        etfMining.unstake(alphaUnstakeAmount); // Unstake 20 mETF
        vm.stopPrank();

        assertEq(
            etfMining.totalStackedBalance(), alphaStakeAmount - alphaUnstakeAmount, "Total staked should be 30 mETF"
        );
        assertEq(
            etfMining.supplierStackedBalance(alpha),
            alphaStakeAmount - alphaUnstakeAmount,
            "Alpha's stake should be 30 mETF"
        );
        assertEq(
            etfToken.balanceOf(alpha),
            alphaEtfBalanceBefore - alphaStakeAmount + alphaUnstakeAmount,
            "Alpha's remaining ETF balance should be 70 mETF"
        );
    }

    function testClaimMiningRewardSingle() public {
        uint256 alphaStakeAmount = 50 * 1e18; // Alpha stakes 50 mETF

        vm.startPrank(alpha);
        etfMining.stake(alphaStakeAmount);
        vm.stopPrank();

        // Fast forward time by 100 seconds
        vm.warp(block.timestamp + 100);

        vm.startPrank(alpha);
        etfMining.claimMiningReward();
        vm.stopPrank();

        uint256 expectedReward = (MINING_SPEED_PER_SECOND * 100 * alphaStakeAmount) / (alphaStakeAmount); // Alpha should get all rewards since it's the only staker
        assertEq(rewardToken.balanceOf(alpha), expectedReward, "Alpha's mining reward should be correct");
    }

    function testClaimMiningRewardMultiple() public {
        uint256 alphaStakeAmount = 50 * 1e18; // Alpha stakes 50 mETF
        uint256 betaStakeAmount = 50 * 1e18; // Beta stakes 50 mETF

        vm.startPrank(alpha);
        etfMining.stake(alphaStakeAmount);
        vm.stopPrank();

        vm.startPrank(beta);
        etfMining.stake(betaStakeAmount);
        vm.stopPrank();

        // Fast forward time by 100 seconds
        vm.warp(block.timestamp + 100);

        vm.startPrank(alpha);
        etfMining.claimMiningReward();
        vm.stopPrank();

        vm.startPrank(beta);
        etfMining.claimMiningReward();
        vm.stopPrank();

        uint256 expectedRewardAlpha = (MINING_SPEED_PER_SECOND * 100 * alphaStakeAmount) / (alphaStakeAmount + betaStakeAmount); // Alpha should get half of the rewards
        uint256 expectedRewardBeta = (MINING_SPEED_PER_SECOND * 100 * betaStakeAmount) / (alphaStakeAmount + betaStakeAmount); // Beta should get half of the rewards

        assertEq(rewardToken.balanceOf(alpha), expectedRewardAlpha, "Alpha's mining reward should be correct");
        assertEq(rewardToken.balanceOf(beta), expectedRewardBeta, "Beta's mining reward should be correct");
    }

    function testGetPendingMiningReward() public {
        uint256 alphaStakeAmount = 50 * 1e18; // Alpha stakes 50 mETF

        vm.startPrank(alpha);
        etfMining.stake(alphaStakeAmount);
        vm.stopPrank();

        // Fast forward time by 100 seconds
        vm.warp(block.timestamp + 100);

        uint256 pendingReward = etfMining.getPendingMiningReward(alpha);
        uint256 expectedReward = (MINING_SPEED_PER_SECOND * 100 * alphaStakeAmount) / (alphaStakeAmount); // Alpha should get all rewards since it's the only staker
        assertEq(pendingReward, expectedReward, "Pending mining reward should be correct");
    }

    function testUpdateMiningSpeed() public {
        uint256 newMiningSpeed = 2 * 1e18; // Update mining speed to 2 reward tokens per second
        etfMining.updateMiningSpeedPerSecond(newMiningSpeed);
        assertEq(etfMining.miningSpeedPerSecond(), newMiningSpeed, "Updated mining speed should be correct");
    }

    function testZeroMiningSpeed() public {
        uint256 alphaStakeAmount = 50 * 1e18; // Alpha stakes 50 mETF

        vm.startPrank(alpha);
        etfMining.stake(alphaStakeAmount);
        vm.stopPrank();

        // Update mining speed to zero
        etfMining.updateMiningSpeedPerSecond(0);

        // Fast forward time by 100 seconds
        vm.warp(block.timestamp + 100);

        uint256 pendingReward = etfMining.getPendingMiningReward(alpha);
        assertEq(pendingReward, 0, "Pending mining reward should be zero when mining speed is zero");
    }

    function testMultipleStakesAndUnstakes() public {
        uint256 alphaStakeAmount1 = 30 * 1e18; // Alpha stakes 30 mETF
        uint256 alphaStakeAmount2 = 20 * 1e18; // Alpha stakes another 20 mETF
        uint256 alphaUnstakeAmount = 10 * 1e18; // Alpha unstakes 10 mETF
        uint256 alphaEtfBalanceBefore = etfToken.balanceOf(alpha);

        vm.startPrank(alpha);
        etfMining.stake(alphaStakeAmount1);
        etfMining.stake(alphaStakeAmount2);
        etfMining.unstake(alphaUnstakeAmount);
        vm.stopPrank();

        assertEq(
            etfMining.totalStackedBalance(),
            alphaStakeAmount1 + alphaStakeAmount2 - alphaUnstakeAmount,
            "Total staked should be 40 mETF"
        );
        assertEq(
            etfMining.supplierStackedBalance(alpha),
            alphaStakeAmount1 + alphaStakeAmount2 - alphaUnstakeAmount,
            "Alpha's stake should be 40 mETF"
        );
        assertEq(
            etfToken.balanceOf(alpha),
            alphaEtfBalanceBefore - alphaStakeAmount1 - alphaStakeAmount2 + alphaUnstakeAmount,
            "Alpha's remaining ETF balance should be 60 mETF"
        );
    }
}

