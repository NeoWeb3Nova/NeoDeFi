// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IETFTrading} from "./interface/IETFTrading.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IETFSwapRouter} from "./interface/IETFSwapRouter.sol";
import {Path} from "v3-periphery/contracts/libraries/Path.sol";

using Path for bytes;

contract ETFTrading is IETFTrading, ERC20, Ownable {
    uint256 public constant HUNDRED_PERCENT = 1_000_000; // 100% = 1,000,000 in basis points
    uint256 public constant FEE_DENOMINATOR = 1_000_000; // Denominator for fee calculations
    uint256 public constant DEFAULT_INVEST_FEE = 3_000; // 0.3% in basis points
    uint256 public constant DEFAULT_REDEEM_FEE = 3_000; // 0.3% in basis points
    uint256 public constant SLAPPAGE_TOLERANCE = 50_000; // 5% in basis points

    address internal feeTo;
    uint256 internal investFee;
    uint256 internal redeemFee;

    address public immutable swapRouter;
    address[] internal ETFWithTokens;
    uint256[] private weights;
    uint256 internal minMintAmount;

    mapping(address => bool) internal tokenExists;

    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory ETFWithTokens_,
        uint256[] memory weights_,
        uint256 minMintAmount_,
        address swapRouter_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(ETFWithTokens_.length > 0, "No tokens provided");
        require(
            ETFWithTokens_.length == weights_.length,
            "Invalid array length"
        );
        require(minMintAmount_ > 0, "Invalid minimum mint amount");
        require(swapRouter_ != address(0), "Invalid swap router");

        swapRouter = swapRouter_;
        ETFWithTokens = ETFWithTokens_;
        weights = weights_;
        minMintAmount = minMintAmount_;

        // Initialize token existence mapping
        for (uint256 i = 0; i < ETFWithTokens_.length; i++) {
            address token = ETFWithTokens_[i];
            require(token != address(0), "Invalid token address");
            require(!tokenExists[token], "Token already exists");
            tokenExists[token] = true;
        }
    }

    function setFee(
        address _feeTo,
        uint256 _investFee,
        uint256 _redeemFee
    ) external override {
        feeTo = _feeTo;
        investFee = _investFee;
        redeemFee = _redeemFee;
    }

    function getInvestTokenAmount(
        uint256 mintAmount
    ) external view override returns (uint256[] memory tokenAmounts) {
        // Implementation here

        uint256 _totalSupply = totalSupply();
        tokenAmounts = new uint256[](ETFWithTokens.length);

        for (uint256 i = 0; i < ETFWithTokens.length; i++) {
            if (_totalSupply == 0) {
                tokenAmounts[i] = Math.mulDiv(
                    mintAmount,
                    weights[i],
                    1e18,
                    Math.Rounding.Ceil
                );
            } else {
                uint256 tokenBalance = IERC20(ETFWithTokens[i]).balanceOf(
                    address(this)
                );
                tokenAmounts[i] = Math.mulDiv(
                    tokenBalance,
                    mintAmount,
                    _totalSupply,
                    Math.Rounding.Ceil
                );
            }
        }
    }

    function getRedeemTokenAmount(
        uint256 redeemAmount
    ) external view override returns (uint256[] memory tokenAmounts) {
        uint256 _totalSupply = totalSupply();
        tokenAmounts = new uint256[](ETFWithTokens.length);

        if (redeemFee > 0) {
            redeemAmount = Math.mulDiv(
                redeemAmount,
                HUNDRED_PERCENT - redeemFee,
                HUNDRED_PERCENT,
                Math.Rounding.Floor
            );
        }

        for (uint256 i = 0; i < ETFWithTokens.length; i++) {
            uint256 tokenBalance = IERC20(ETFWithTokens[i]).balanceOf(
                address(this)
            );
            tokenAmounts[i] = Math.mulDiv(
                tokenBalance,
                redeemAmount,
                _totalSupply,
                Math.Rounding.Floor
            );
        }
    }

    function _checkSwapPath(
        address targetToken,
        address srcToken,
        bytes memory swapPath
    ) internal pure returns (bool) {
        // Check if the swap path is valid for the given target token and source token
        // This is a placeholder implementation; you should implement your own logic
        // to validate the swap path based on your requirements.

        (address firstToken, address secondToken, ) = swapPath
            .decodefirstPool();

        if (targetToken == srcToken) {
            if (
                firstToken == targetToken &&
                secondToken == targetToken &&
                !swapPath.hasMultiplePools()
            ) {
                return true;
            } else {
                return false;
            }
        } else {
            if (firstToken != targetToken) {
                return false;
            }
            while (swapPath.hasMultiplePools()) {
                swapPath = swapPath.skipToken();
            }

            (, secondToken, ) = swapPath.decodeFirstPool();
            if (sencondToken != srcToken) {
                return false;
            }
            return true;
        }
    }

    function _invest(address to, uint256 mintAmount) internal {
        if (mintAmount < minMintAmount) {
            revert LessThanMinMintAmount();
        }

        if (investFee > 0) {
            uint256 feeAmount = Math.mulDiv(
                mintAmount,
                investFee,
                HUNDRED_PERCENT,
                Math.Rounding.Floor
            );
            mintAmount -= feeAmount;
            if (feeAmount > 0) {
                _mint(feeTo, feeAmount);
            }
        }

        _mint(to, mintAmount);
    }

    function investWithToken(
        address srcToken,
        address to,
        uint256 mintAmount,
        uint256 maxInvestAmount,
        bytes[] calldata swapPaths
    ) external override {
        address[] memory tokens = getTokens();

        if (tokens.length != swapPaths.length) {
            revert InvalidArrayLength();
        }

        uint256[] memory tokenAmounts = getInvestTokenAmount(mintAmount);

        IERC20(srcToken).safeTransferFrom(
            msg.sender,
            address(this),
            maxInvestAmount
        );

        IERC20(srcToken).approve(swapRouter, maxInvestAmount);

        uint256 totalInvestAmount = 0;

        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokenAmounts[i] == 0) {
                continue;
            }

            if (!_checkSwapPath(tokens[i], srcToken, swapPaths[i])) {
                revert InvalidSwapPath(swapPaths[i]);
            }

            if (tokens[i] != srcToken) {
                //这里要把当前的代币换成目标代币，swapExactIn会返回实际投资的金额
                // totalInvestAmount += IETFSwapRouter(swapRouter).swapExactIn(
                //     srcToken,
                //     tokens[i],
                //     tokenAmounts[i],
                //     swapPaths[i]
                // );
            } else {
                totalInvestAmount += tokenAmounts[i];
            }
        }

        require(totalInvestAmount < maxInvestAmount, "Over max invest amount");

        uint256 remainingAmount = maxInvestAmount - totalInvestAmount;
        IERC20(srcToken).safeTransfer(msg.sender, remainingAmount);

        _invest(to, mintAmount);

        emit InvestedWithToken(srcToken, to, mintAmount, totalInvestAmount);
    }

    function redeemToToken(
        address srcToken,
        address to,
        uint256 redeemAmount,
        uint256 minRedeemAmount
    ) external override {
        // Implementation here
    }

    function getTokens()
        external
        view
        override
        returns (address[] memory tokens)
    {
        // Implementation here
    }
}
