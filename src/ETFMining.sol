// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IETFMining} from "./interface/IETFMining.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {FullMath} from "./libraries/FullMath.sol";

contract ETFMining is IETFMining {
    using SafeERC20 for IERC20;
    using FullMath for uint256;

    uint256 public constant INDEX_SCALE = 1e36;

    address public miningToken;
    address public etfAddress;
    uint256 public miningSpeedPerSecond;
    uint256 public miningLastIndex;
    uint256 public lastIndexUpdateTime;

    mapping(address => uint256) public supplierLastIndex;
    mapping(address => uint256) public supplierAccruedMining;
    mapping(address => uint256) public supplierStackedBalance;
    uint256 public totalStackedBalance;

    constructor(address _miningToken, address _etfAddress, uint256 _miningSpeedPerSecond) {
        miningToken = _miningToken;
        etfAddress = _etfAddress;
        miningSpeedPerSecond = _miningSpeedPerSecond;
        miningLastIndex = 1 * INDEX_SCALE; // 初始指数为1
        lastIndexUpdateTime = block.timestamp;
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");

        // 更新用户的挖矿奖励
        _updateMiningIndex();
        _updateSupplierIndex(msg.sender);

        // 更新用户的质押余额和总质押余额
        supplierStackedBalance[msg.sender] += amount;
        totalStackedBalance += amount;

        // 更新用户的最后挖矿指数
        supplierLastIndex[msg.sender] = miningLastIndex;

        // 这里应该有转移矿工代币的逻辑，例如调用ERC20的transferFrom方法
        IERC20(etfAddress).safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    function _updateMiningIndex() internal {
        if (miningLastIndex == 0) {
            // 首次初始化
            miningLastIndex = INDEX_SCALE;
            lastIndexUpdateTime = block.timestamp;
        } else {
            uint256 deltaTime = block.timestamp - lastIndexUpdateTime;
            if (totalStaked > 0 && deltaTime > 0 && miningSpeedPerSecond > 0) {
                // 计算时间段内应产生的总奖励
                uint256 deltaReward = miningSpeedPerSecond * deltaTime;
                // 将奖励转换为指数增量：deltaReward * INDEX_SCALE / totalStaked
                uint256 deltaIndex = deltaReward.mulDiv(INDEX_SCALE, totalStaked);
                miningLastIndex += deltaIndex;
                lastIndexUpdateTime = block.timestamp;
            } else if (deltaTime > 0) {
                // 即使没有产生新的指数，也更新时间戳
                lastIndexUpdateTime = block.timestamp;
            }
        }
    }

    function updateMingSpeedPerSecond(uint256 _miningSpeedPerSecond) external {
        _updateMiningIndex();
        miningSpeedPerSecond = _miningSpeedPerSecond;
    }

    function _updateSupplierIndex(address supplier) internal {
        uint256 lastIndex = supplierLastIndex[supplier];
        uint256 supply = stakedBalances[supplier];
        uint256 deltaIndex;
        if (lastIndex > 0 && supply > 0) {
            // 计算用户指数的增量
            deltaIndex = miningLastIndex - lastIndex;
            // 计算用户应得奖励：用户质押量 * 指数增量 / INDEX_SCALE
            uint256 deltaReward = supply.mulDiv(deltaIndex, INDEX_SCALE);
            supplierRewardAccrued[supplier] += deltaReward;
        }
        supplierLastIndex[supplier] = miningLastIndex;
        emit SupplierIndexUpdated(supplier, deltaIndex, miningLastIndex);
    }

    function unstake(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(supplierStackedBalance[msg.sender] >= amount, "Insufficient staked balance");

        // 更新用户的挖矿奖励
        _updateMiningIndex();
        _updateSupplierIndex(msg.sender);

        // 更新用户的质押余额和总质押余额
        supplierStackedBalance[msg.sender] -= amount;
        totalStackedBalance -= amount;

        // 这里应该有转移矿工代币的逻辑，例如调用ERC20的transfer方法
        IERC20(etfAddress).safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimMiningReward() external {
        // 更新用户的挖矿奖励
        _updateMiningIndex();
        _updateSupplierIndex(msg.sender);

        uint256 reward = supplierAccruedMining[msg.sender];
        require(reward > 0, "No mining rewards to claim");

        // 重置用户的累计挖矿奖励
        supplierAccruedMining[msg.sender] = 0;

        // 转移挖矿奖励给用户
        IERC20(miningToken).safeTransfer(msg.sender, reward);

        emit MiningRewardClaimed(msg.sender, reward);
    }

    function getPendingMiningReward(address supplier) external view returns (uint256) {
        uint256 claimable = supplierAccruedMining[supplier];

        // 计算最新的全局指数
        uint256 globalLastIndex = miningLastIndex;
        if (totalStackedBalance > 0 && block.timestamp > lastIndexUpdateTime && miningSpeedPerSecond > 0) {
            uint256 deltaTime = block.timestamp - lastIndexUpdateTime;
            uint256 deltaReward = miningSpeedPerSecond * deltaTime;
            uint256 deltaIndex = deltaReward.mulDiv(INDEX_SCALE, totalStackedBalance);
            globalLastIndex += deltaIndex;
        }

        // 计算用户可累加的奖励
        uint256 supplierIndex = supplierLastIndex[supplier];
        uint256 supplierSupply = supplierStackedBalance[supplier];
        uint256 supplierDeltaIndex;
        if (supplierIndex > 0 && supplierSupply > 0) {
            supplierDeltaIndex = globalLastIndex - supplierIndex;
            uint256 supplierDeltaReward = supplierSupply.mulDiv(supplierDeltaIndex, INDEX_SCALE);
            claimable += supplierDeltaReward;
        }

        return claimable;
    }
}
