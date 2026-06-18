// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IETFTrading} from "./interface/IETFTrading.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

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
                uint256 tokenBalance = ERC20(ETFWithTokens[i]).balanceOf(
                    address(this)
                );
                tokenAmounts[i] = Math.mulDiv(
                    tokenBalance,
                    mintAmount,
                    _totalSupply
                );
            }
        }
    }

    function getRedeemTokenAmount(
        uint256 redeemAmount
    ) external view override returns (uint256[] memory tokenAmounts) {
        // Implementation here
    }

    function investWithToken(
        address srcToken,
        address to,
        uint256 mintAmount,
        uint256 maxInvestAmount,
        bytes[] calldata swapPaths
    ) external override {
        // Implementation here
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
