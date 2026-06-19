// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice Utility library for formatting token amounts to human-readable strings
library FormatUtils {
    using Strings for uint256;

    /// @notice 把代币最小单位的金额格式化成人类可读的十进制字符串
    /// @dev 例：formatTokenAmount(1234560000, 6) => "1234.56"
    ///      formatTokenAmount(5, 6)               => "0.000005"
    ///      formatTokenAmount(100_000000, 6)       => "100"（整数不带小数点）
    function formatTokenAmount(
        uint256 amount,
        uint8 decimals
    ) internal pure returns (string memory) {
        if (decimals == 0) {
            return amount.toString();
        }

        uint256 unit = 10 ** decimals;
        uint256 integerPart = amount / unit;
        uint256 fractionalPart = amount % unit;

        if (fractionalPart == 0) {
            return integerPart.toString();
        }

        // 先算出去掉末尾 0 之后，小数部分实际需要的位数
        uint8 fracLength = decimals;
        uint256 temp = fractionalPart;
        while (temp % 10 == 0) {
            temp /= 10;
            fracLength--;
        }

        bytes memory intBytes = bytes(integerPart.toString());
        uint256 totalLength = intBytes.length + 1 + fracLength; // +1 是小数点
        bytes memory buffer = new bytes(totalLength);

        // 写整数部分
        for (uint256 i = 0; i < intBytes.length; i++) {
            buffer[i] = intBytes[i];
        }
        buffer[intBytes.length] = ".";

        // 从后往前写有效数字，剩下的前导空位用 0 补齐
        // （比如 fractionalPart=50000, decimals=6 -> 裁剪后是 "05"，
        //  先写出有效数字 "5"，再往前补一个 "0"）
        uint256 sigDigits = fractionalPart / (10 ** (decimals - fracLength));
        uint256 cursor = totalLength;
        while (sigDigits > 0) {
            cursor--;
            buffer[cursor] = bytes1(uint8(48 + (sigDigits % 10)));
            sigDigits /= 10;
        }
        while (cursor > intBytes.length + 1) {
            cursor--;
            buffer[cursor] = "0";
        }

        return string(buffer);
    }
}
