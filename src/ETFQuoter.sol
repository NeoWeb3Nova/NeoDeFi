// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IETFQuoter} from "./interface/IETFQuoter.sol";
import {IETFTrading} from "./interface/IETFTrading.sol";
import {IUniswapV3Quoter} from "./interface/IUniswapV3Quoter.sol";

contract ETFQuoter is IETFQuoter {
    uint24[] public fees;

    IUniswapV3Quoter public immutable uniswapV3Quoter;

    constructor(address _uniswapV3Quoter) {
        uniswapV3Quoter = IUniswapV3Quoter(_uniswapV3Quoter);
        fees = [100, 500, 3000, 10000];
    }

    function quoteInvestWithToken(
        address etf,
        address srcToken,
        uint256 mintAmount
    ) external view returns (uint256 srcTokenAmount, bytes[] memory path) {
        IETFTrading trading = IETFTrading(etf);

        address[] memory tokens = trading.getTokens();

        uint256[] memory tokenAmount = trading.getInvestTokenAmount(mintAmount);

        path = new bytes[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == srcToken) {
                srcTokenAmount += tokenAmount[i];
                path[i] = bytes.concat(
                    bytes20(srcToken),
                    bytes3(fees[0]),
                    bytes20(srcToken)
                );
            } else {
                (bytes memory _path, uint256 _amountIn) = quoteExactOut(
                    srcToken,
                    tokens[i],
                    tokenAmount[i]
                );
                path[i] = _path;
                srcTokenAmount += _amountIn;
            }
        }
    }

    function quoteRedeemToToken(
        address etf,
        address dstToken,
        uint256 burnAmount
    ) external view returns (uint256 dstTokenAmount, bytes[] memory path) {
        IETFTrading trading = IETFTrading(etf);

        address[] memory tokens = trading.getTokens();

        uint256[] memory tokenAmount = trading.getRedeemTokenAmount(burnAmount);

        path = new bytes[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == dstToken) {
                dstTokenAmount += tokenAmount[i];
                path[i] = bytes.concat(
                    bytes20(dstToken),
                    bytes3(fees[0]),
                    bytes20(dstToken)
                );
            } else {
                (bytes memory _path, uint256 _amountOut) = quoteExactIn(
                    tokens[i],
                    dstToken,
                    tokenAmount[i]
                );
                path[i] = _path;
                dstTokenAmount += _amountOut;
            }
        }
    }

    function quoteExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (bytes memory path, uint256 amountOut) {
        bytes[] memory paths = getAllPaths(tokenIn, tokenOut);

        for (uint256 i = 0; i < paths.length; i++) {
            try uniswapV3Quoter.quoteExactInput(paths[i], amountIn) returns (
                uint256 _amountOut,
                uint160[] memory,
                uint32[] memory,
                uint256
            ) {
                if (
                    _amountOut > 0 && (amountOut == 0 || _amountOut > amountOut)
                ) {
                    amountOut = _amountOut;
                    path = paths[i];
                }
            } catch {}
        }
        require(path.length > 0, "No valid swap path found");
    }

    function quoteExactOut(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) public view returns (bytes memory path, uint256 amountIn) {
        bytes[] memory paths = getAllPaths(tokenOut, tokenIn);

        for (uint256 i = 0; i < paths.length; i++) {
            try uniswapV3Quoter.quoteExactOutput(paths[i], amountOut) returns (
                uint256 _amountIn,
                uint160[] memory,
                uint32[] memory,
                uint256
            ) {
                if (_amountIn > 0 && (amountIn == 0 || _amountIn < amountIn)) {
                    amountIn = _amountIn;
                    path = paths[i];
                }
            } catch {}
        }

        require(path.length > 0, "No valid swap path found");
    }

    function getAllPaths(
        address srcToken,
        address dstToken
    ) public view returns (bytes[] memory paths) {
        paths = new bytes[](fees.length);
        for (uint256 i = 0; i < fees.length; i++) {
            paths[i] = bytes.concat(
                bytes20(srcToken),
                bytes3(fees[i]),
                bytes20(dstToken)
            );
        }
    }
}
