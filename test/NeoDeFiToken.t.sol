// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {NeoDeFiToken} from "src/NeoDeFiToken.sol";

contract NeoDeFiTokenTest is Test {
  NeoDeFiToken public instance;

  function setUp() public {
    address initialOwner = vm.addr(1);
    address recipient = vm.addr(2);
    address defaultAdmin = vm.addr(3);
    address pauser = vm.addr(4);
    address minter = vm.addr(5);
    address proxy = Upgrades.deployTransparentProxy(
      "NeoDeFiToken.sol",
      initialOwner,
      abi.encodeCall(NeoDeFiToken.initialize, (recipient, defaultAdmin, pauser, minter))
    );
    instance = NeoDeFiToken(proxy);
  }

  function testName() public view {
    assertEq(instance.name(), "Neo DeFi Token");
  }
}
