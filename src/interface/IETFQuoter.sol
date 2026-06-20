// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IETFQuoter {
    error SameToken();

    function getAllPaths(address srcToken, address dstToken) external view returns (bytes[] memory paths);

    function quoteInvestWithToken(address etf, address srcToken, uint256 mintAmount)
        external
        view
        returns (uint256 srcTokenAmount, bytes[] memory path);

    function quoteRedeemToToken(address etf, address dstToken, uint256 burnAmount)
        external
        view
        returns (uint256 dstTokenAmount, bytes[] memory path);

    function quoteExactOut(address tokenIn, address tokenOut, uint256 amountOut)
        external
        view
        returns (bytes memory path, uint256 amountIn);

    function quoteExactIn(address tokenIn, address tokenOut, uint256 amountIn)
        external
        view
        returns (bytes memory path, uint256 amountOut);
}
