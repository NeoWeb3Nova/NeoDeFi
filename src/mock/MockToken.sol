// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract MockToken is ERC20, ERC20Burnable, Ownable {
    uint8 private immutable decimalsValue;

    constructor(string memory _name, string memory _symbol, uint8 _decimals)
        ERC20(_name, _symbol)
        Ownable(msg.sender)
    {
        decimalsValue = _decimals;
    }

    function decimals() public view override returns (uint8) {
        return decimalsValue;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
