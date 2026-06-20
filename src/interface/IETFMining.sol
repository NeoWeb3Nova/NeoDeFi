// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IETFMining {
    error NothingToClaim();
    event SupplierIndexUpdated(address indexed supplier, uint256 deltaIndex, uint256 lastIndex);
    event RewardsClaimed(address indexed supplier, uint256 amount);
    event Staked(address indexed supplier, uint256 amount);
    event Unstaked(address indexed supplier, uint256 amount);

    function stake(uint256 amount) external;

    function unstake(uint256 amount) external;

    function claimRewards() external;

    function getPendingRewards(address supplier) external view returns (uint256);
}
