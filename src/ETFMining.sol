// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IETFMining} from "./interface/IETFMining.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import {FullMath} from "./libraries/FullMath.sol";

contract ETFMining is IETFMining {
    using SafeERC20 for IERC20;
    // using FullMath for uint256;

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

    constructor(
        address _miningToken,
        address _etfAddress,
        uint256 _miningSpeedPerSecond
    ) {
        miningToken = _miningToken;
        etfAddress = _etfAddress;
        miningSpeedPerSecond = _miningSpeedPerSecond;
        miningLastIndex = 1 * INDEX_SCALE; // 初始指数为1
        lastIndexUpdateTime = block.timestamp;
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        _updateMiningIndex();

        // 更新用户的挖矿奖励
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
        uint256 timeElapsed = block.timestamp - lastIndexUpdateTime;
        if (timeElapsed > 0 && totalStackedBalance > 0) {
            uint256 miningReward = timeElapsed * miningSpeedPerSecond;
            uint256 indexIncrement = (miningReward * INDEX_SCALE) /
                totalStackedBalance;
            miningLastIndex += indexIncrement;
            lastIndexUpdateTime = block.timestamp;
        }
    }

    function updateMingSpeedPerSecond(uint256 _miningSpeedPerSecond) external {
        miningSpeedPerSecond = _miningSpeedPerSecond;
    }

    function _updateSupplierIndex(address supplier) internal {
        uint256 userIndex = supplierLastIndex[supplier];
        if (userIndex > 0) {
            uint256 pendingReward = (supplierStackedBalance[supplier] *
                (miningLastIndex - userIndex)) / INDEX_SCALE;
            supplierAccruedMining[supplier] += pendingReward;
        }
        supplierLastIndex[supplier] = miningLastIndex;

        emit SupplierIndexUpdated(supplier, supplierLastIndex[supplier]);
    }


    function unstake(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");
        require(
            supplierStackedBalance[msg.sender] >= amount,
            "Insufficient staked balance"
        );
        _updateMiningIndex();

        // 更新用户的挖矿奖励
        _updateSupplierIndex(msg.sender);

        // 更新用户的质押余额和总质押余额
        supplierStackedBalance[msg.sender] -= amount;
        totalStackedBalance -= amount;

        // 这里应该有转移矿工代币的逻辑，例如调用ERC20的transfer方法
        IERC20(etfAddress).safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimMiningReward() external {
        _updateMiningIndex();

        // 更新用户的挖矿奖励
        _updateSupplierIndex(msg.sender);

        uint256 reward = supplierAccruedMining[msg.sender];
        require(reward > 0, "No mining rewards to claim");

        // 重置用户的累计挖矿奖励
        supplierAccruedMining[msg.sender] = 0;

        // 转移挖矿奖励给用户
        IERC20(miningToken).safeTransfer(msg.sender, reward);

        emit MiningRewardClaimed(msg.sender, reward);
    }

    function getPendingMiningReward(address supplier)
        external
        view
        returns (uint256)
    {
        uint256 userIndex = supplierLastIndex[supplier];
        if (userIndex == 0) {
            return supplierAccruedMining[supplier];
        }
        uint256 pendingReward = (supplierStackedBalance[supplier] *
            (miningLastIndex - userIndex)) / INDEX_SCALE;
        return supplierAccruedMining[supplier] + pendingReward;
    }
}
