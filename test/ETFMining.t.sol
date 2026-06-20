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
    uint256 public constant MINING_SPEED = 1 * 1e18; // 1 reward tokens per second

    function setUp() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        deployerAddress = vm.addr(privateKey);

        // Deploy mock reward token and ETF token
        rewardToken = new MockToken("Reward Token", "RWD", 18);
        etfToken = new MockETF();

        // Deploy the ETFMining contract
        etfMining = new ETFMining(address(rewardToken), address(etfToken), MINING_SPEED);

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
        assertEq(etfMining.miningSpeedPerSecond(), MINING_SPEED, "Initial mining speed mismatch");
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
}

