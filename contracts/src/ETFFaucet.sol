// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MockToken} from "./mock/MockToken.sol";

contract ETFFaucet is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public mockNBTC;
    IERC20 public mockNETH;
    IERC20 public mockLINK;
    IERC20 public mockUSDC;

    uint256 public nbtcAmount = 0.1 * 10 ** 8; // 0.1 tokens with 8 decimals
    uint256 public nethAmount = 0.5 * 10 ** 18; // 0.5 tokens with 18 decimals
    uint256 public linkAmount = 50 * 10 ** 18; // 50 tokens with 18 decimals
    uint256 public usdcAmount = 100 * 10 ** 6; // 100 tokens with 6 decimals

    uint256 public cooldownTimePeriod = 5 minutes; // 5 minute cooldown

    mapping(address => mapping(address => uint256)) public lastRequestTime;

    event CooldownTimeUpdated(uint256 newCooldownTime);
    event AmountsUpdated(address token, uint256 newAmount);
    event TokensDispensed(address indexed recipient, address indexed token, uint256 amount);
    event FaucetDrained(address indexed token, uint256 amount);

    constructor(address _mockNBTC, address _mockNETH, address _mockLINK, address _mockUSDC) Ownable(msg.sender) {
        mockNBTC = IERC20(_mockNBTC);
        mockNETH = IERC20(_mockNETH);
        mockLINK = IERC20(_mockLINK);
        mockUSDC = IERC20(_mockUSDC);
    }

    function requestTokens(address tokenAddress) public {
        require(
            tokenAddress == address(mockNBTC) || tokenAddress == address(mockNETH) || tokenAddress == address(mockLINK)
                || tokenAddress == address(mockUSDC),
            "Invalid token address"
        );

        require(
            // forge-lint: disable-next-line(block-timestamp)
            block.timestamp >= lastRequestTime[msg.sender][tokenAddress] + cooldownTimePeriod,
            "Cooldown period not yet passed"
        );

        IERC20 selectedToken = IERC20(tokenAddress);
        uint256 balance = selectedToken.balanceOf(address(this));

        uint256 amount;
        if (tokenAddress == address(mockNBTC)) {
            amount = nbtcAmount;
        } else if (tokenAddress == address(mockNETH)) {
            amount = nethAmount;
        } else if (tokenAddress == address(mockLINK)) {
            amount = linkAmount;
        } else if (tokenAddress == address(mockUSDC)) {
            amount = usdcAmount;
        }

        require(balance >= amount, "Faucet has insufficient balance");

        // forge-lint: disable-next-line(block-timestamp)
        lastRequestTime[msg.sender][tokenAddress] = block.timestamp;
        selectedToken.safeTransfer(msg.sender, amount);

        emit TokensDispensed(msg.sender, tokenAddress, amount);
    }

    function requestAllTokens() external {
        requestTokens(address(mockNBTC));
        requestTokens(address(mockNETH));
        requestTokens(address(mockLINK));
        requestTokens(address(mockUSDC));
    }

    function setCooldownTime(uint256 newCooldownTime) external onlyOwner {
        cooldownTimePeriod = newCooldownTime;
        emit CooldownTimeUpdated(newCooldownTime);
    }

    function setTokenAmount(address tokenAddress, uint256 newAmount) external onlyOwner {
        require(
            tokenAddress == address(mockNBTC) || tokenAddress == address(mockNETH) || tokenAddress == address(mockLINK)
                || tokenAddress == address(mockUSDC),
            "Invalid token address"
        );

        if (tokenAddress == address(mockNBTC)) {
            nbtcAmount = newAmount;
        } else if (tokenAddress == address(mockNETH)) {
            nethAmount = newAmount;
        } else if (tokenAddress == address(mockLINK)) {
            linkAmount = newAmount;
        } else if (tokenAddress == address(mockUSDC)) {
            usdcAmount = newAmount;
        }

        emit AmountsUpdated(tokenAddress, newAmount);
    }

    function getTokenBalance(address tokenAddress) external view returns (uint256) {
        require(
            tokenAddress == address(mockNBTC) || tokenAddress == address(mockNETH) || tokenAddress == address(mockLINK)
                || tokenAddress == address(mockUSDC),
            "Invalid token address"
        );

        IERC20 selectedToken = IERC20(tokenAddress);
        return selectedToken.balanceOf(address(this));
    }

    function getTokenAmount(address tokenAddress) external view returns (uint256) {
        require(
            tokenAddress == address(mockNBTC) || tokenAddress == address(mockNETH) || tokenAddress == address(mockLINK)
                || tokenAddress == address(mockUSDC),
            "Invalid token address"
        );

        if (tokenAddress == address(mockNBTC)) {
            return nbtcAmount;
        } else if (tokenAddress == address(mockNETH)) {
            return nethAmount;
        } else if (tokenAddress == address(mockLINK)) {
            return linkAmount;
        } else if (tokenAddress == address(mockUSDC)) {
            return usdcAmount;
        }

        return 0; // This line should never be reached due to the require statement
    }

    function getCooldownTimeRemaining(address user, address tokenAddress) external view returns (uint256) {
        require(
            tokenAddress == address(mockNBTC) || tokenAddress == address(mockNETH) || tokenAddress == address(mockLINK)
                || tokenAddress == address(mockUSDC),
            "Invalid token address"
        );

        uint256 lastTime = lastRequestTime[user][tokenAddress];
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp >= lastTime + cooldownTimePeriod) {
            return 0;
        } else {
            // forge-lint: disable-next-line(block-timestamp)
            return (lastTime + cooldownTimePeriod) - block.timestamp;
        }
    }
}
