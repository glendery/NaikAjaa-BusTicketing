// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BusTicket is ERC721 {
    // Kita ganti Counters dengan variabel manual (lebih hemat gas)
    uint256 private _nextTokenId;

    struct TicketInfo {
        string rute;
        uint256 harga;
        uint256 waktuBeli;
    }

    mapping(uint256 => TicketInfo) public tickets;

    constructor() ERC721("SumutBusTicket", "SBT") {
        // Mulai ID dari 1 supaya terlihat rapi
        _nextTokenId = 1; 
    }

    function mintTicket(address penumpang, string memory rute, uint256 harga)
        public
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;

        _mint(penumpang, tokenId);
        tickets[tokenId] = TicketInfo(rute, harga, block.timestamp);

        return tokenId;
    }
}