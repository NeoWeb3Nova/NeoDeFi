// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IETFMining {
    error NothingToClaim();
    event SupplierIndexUpdated(address indexed supplier, uint256 lastIndex);
    event MiningRewardClaimed(address indexed supplier, uint256 amount);
    event Staked(address indexed supplier, uint256 amount);
    event Unstaked(address indexed supplier, uint256 amount);

    function stake(uint256 amount) external;

    function unstake(uint256 amount) external;

    function claimMiningReward() external;

    function getPendingMiningReward(address supplier) external view returns (uint256);
}
