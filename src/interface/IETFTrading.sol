// // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IETFTrading {
    error LessThanMinMintAmount();

    error TokenNotSupported();

    error TokenExists();

    error InvalidSwapPath(bytes swapPath);
    error InvalidArrayLength();
    error OverSlippage();
    error SafeTransferETFFailed();

    event InvestedWithToken(
        address indexed srcToken,
        address indexed to,
        uint256 mintAmount,
        uint256 investAmount
    );

    event RedeemedToToken(
        address indexed srcToken,
        address indexed to,
        uint256 redeemAmount,
        uint256 redeemAmountOut
    );

    function setFee(
        address feeTo,
        uint256 investFee,
        uint256 redeemFee
    ) external;

    function getInvestTokenAmount(
        uint256 mintAmount
    ) external view returns (uint256[] memory tokenAmounts);

    function getRedeemTokenAmount(
        uint256 redeemAmount
    ) external view returns (uint256[] memory tokenAmounts);

    function investWithToken(
        address srcToken,
        address to,
        uint256 mintAmount,
        uint256 maxInvestAmount,
        bytes[] calldata swapPaths
    ) external;

    function redeemToToken(
        address srcToken,
        address to,
        uint256 redeemAmount,
        uint256 minRedeemAmount,
        bytes[] calldata swapPaths
    ) external;

    function getTokens() external view returns (address[] memory tokens);
}
