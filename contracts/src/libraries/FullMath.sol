// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

/**
 * @title 512位数学计算库
 * @notice 提供可以处理中间值溢出的乘法和除法运算，且不会损失精度
 * @dev 处理"幻影溢出"，即允许中间值超过256位的乘法和除法运算
 * 这个库主要用于需要高精度计算的场景，比如在DeFi中计算代币数量、份额等
 */
library FullMath {
    /**
     * @notice 计算 floor(a×b÷denominator)，具有完整精度
     * @dev 使用了中国剩余定理来重建512位的结果
     * 代码来源：Remco Bloemen (MIT license) https://xn--2-umb.com/21/muldiv
     * @param a 被乘数
     * @param b 乘数
     * @param denominator 除数
     * @return result 256位结果（向下取整）
     * @dev 如果结果溢出uint256或除数为0，则抛出异常
     */
    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        // 512位乘法 [prod1 prod0] = a * b
        // 分别计算对2**256和2**256-1取模的乘积
        // 然后使用中国剩余定理重建512位结果
        // 结果存储在两个256位变量中：product = prod1 * 2**256 + prod0
        uint256 prod0; // 乘积的低256位
        uint256 prod1; // 乘积的高256位
        assembly {
            let mm := mulmod(a, b, not(0))
            prod0 := mul(a, b)
            prod1 := sub(sub(mm, prod0), lt(mm, prod0))
        }

        // 处理未溢出的情况，直接进行256位除法
        if (prod1 == 0) {
            require(denominator > 0);
            assembly {
                result := div(prod0, denominator)
            }
            return result;
        }

        // 确保结果小于2**256
        // 同时防止除数为0
        require(denominator > prod1);

        ///////////////////////////////////////////////
        // 512位除以256位的除法
        ///////////////////////////////////////////////

        // 通过减去余数使除法精确
        uint256 remainder;
        assembly {
            remainder := mulmod(a, b, denominator)
        }
        // 从512位数中减去256位数
        assembly {
            prod1 := sub(prod1, gt(remainder, prod0))
            prod0 := sub(prod0, remainder)
        }

        // 从除数中分解出2的幂
        // 计算除数的最大2的幂因子
        uint256 twos = ~denominator + 1 & denominator;
        // 将除数除以2的幂
        assembly {
            denominator := div(denominator, twos)
        }

        // 将[prod1 prod0]除以2的幂因子
        assembly {
            prod0 := div(prod0, twos)
        }
        // 将prod1的位移入prod0
        // 需要翻转twos使其变为2**256 / twos
        assembly {
            twos := add(div(sub(0, twos), twos), 1)
        }
        prod0 |= prod1 * twos;

        // 计算除数在2**256下的模逆
        // 现在除数是奇数，它在模2**256下有逆元
        // 从4位正确的种子开始计算逆元
        uint256 inv = (3 * denominator) ^ 2;
        // 使用牛顿-拉弗森迭代提高精度
        // 根据Hensel引理，这在模运算中也有效
        inv *= 2 - denominator * inv; // 模2**8的逆
        inv *= 2 - denominator * inv; // 模2**16的逆
        inv *= 2 - denominator * inv; // 模2**32的逆
        inv *= 2 - denominator * inv; // 模2**64的逆
        inv *= 2 - denominator * inv; // 模2**128的逆
        inv *= 2 - denominator * inv; // 模2**256的逆

        // 因为除法现在是精确的，我们可以通过乘以除数的模逆来进行除法
        // 这将给我们模2**256的正确结果
        // 由于前提条件保证结果小于2**256，这就是最终结果
        result = prod0 * inv;
        return result;
    }

    /**
     * @notice 计算 ceil(a×b÷denominator)，具有完整精度
     * @dev 首先使用mulDiv计算向下取整的结果，然后在有余数的情况下加1
     * @param a 被乘数
     * @param b 乘数
     * @param denominator 除数
     * @return result 256位结果（向上取整）
     */
    function mulDivRoundingUp(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        result = mulDiv(a, b, denominator);
        if (mulmod(a, b, denominator) > 0) {
            require(result < type(uint256).max);
            result++;
        }
    }
}
