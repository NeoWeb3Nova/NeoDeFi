// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {NeoDeFiToken} from "src/NeoDeFiToken.sol";

contract NeoDeFiTokenScript is Script {
  function setUp() public {}

  function run() public {
    // TODO: Set addresses for the variables below, then uncomment the following section:
    /*
    vm.startBroadcast();
    address initialOwner = <Set initialOwner address here>;
    address recipient = <Set recipient address here>;
    address defaultAdmin = <Set defaultAdmin address here>;
    address pauser = <Set pauser address here>;
    address minter = <Set minter address here>;
    address proxy = Upgrades.deployTransparentProxy(
      "NeoDeFiToken.sol",
      initialOwner,
      abi.encodeCall(NeoDeFiToken.initialize, (recipient, defaultAdmin, pauser, minter))
    );
    NeoDeFiToken instance = NeoDeFiToken(proxy);
    console.log("Proxy deployed to %s", address(instance));
    vm.stopBroadcast();
    */
  }
}
